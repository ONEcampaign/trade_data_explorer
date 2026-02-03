import json
import ftfy
import pandas as pd

from bblocks.places import resolve_places
from bblocks.data_importers.baci.baci import BACI

from src.data.config import HS_VERSION, PATHS, logger
from src.data.scripts.helper_functions import (
    convert_values_to_units,
    write_partitioned_dataset,
)
from src.data.scripts.transformations import (
    add_country_groups,
    add_currencies_and_prices,
    reshape_to_country_flow,
)


def load_mappings() -> tuple[
    dict[str, str],
    dict[str, list[str]],
    dict[str, list[str]],
    pd.DataFrame,
]:
    """Load product and country mappings required by the trade data pipeline."""
    logger.info("Loading mappings")
    with open(PATHS.HS_SECTIONS, "r") as f:
        hs_dict = json.load(f)
    product_code_to_section = {
        code: category for category, codes in hs_dict.items() for code in codes
    }

    with open(PATHS.COUNTRY_GROUPS, "r", encoding="utf-8") as f:
        group_to_iso3_raw = json.load(f)

    group_to_iso3 = {
        group: sorted({code.upper() for code in members})
        for group, members in group_to_iso3_raw.items()
    }

    iso3_to_groups: dict[str, list[str]] = {}
    for group, members in group_to_iso3.items():
        for iso in members:
            iso3_to_groups.setdefault(iso, []).append(group)

    iso3_to_groups = {iso: sorted(groups) for iso, groups in iso3_to_groups.items()}

    membership_rows = [
        (iso, group)
        for group, members in group_to_iso3.items()
        for iso in members
    ]
    membership_df = pd.DataFrame(membership_rows, columns=["iso3", "group"])

    return (
        product_code_to_section,
        group_to_iso3,
        iso3_to_groups,
        membership_df,
    )


def import_transform_trade(
    product_code_to_section: dict[str, str],
) -> pd.DataFrame:
    """Import BACI data, add product, country mappings and reshape dataframe"""

    baci = BACI()

    df = baci.get_data(hs_version=HS_VERSION)
    lookup_df = baci.get_data(hs_version=HS_VERSION)
    country_code_to_iso3 = lookup_df.set_index("country_code")["iso3_code"]

    df["category"] = (
        df["product_code"]
        .astype(str)
        .str.zfill(6)
        .str[:2]
        .map(product_code_to_section)
    )
    df["exporter_iso3"] = df["exporter_code"].map(country_code_to_iso3)
    df["importer_iso3"] = df["importer_code"].map(country_code_to_iso3)

    df = (
        df.dropna(subset=["value"])
        .groupby(["year", "exporter_iso3", "importer_iso3", "category"], as_index=False)
        .agg({"value": "sum"})
    )

    df["value"] /= 1_000  # Convert from thousands to millions

    df_wide = (
        df.pivot(
            index=["year", "exporter_iso3", "importer_iso3"],
            columns="category",
            values="value",
        )
        .reset_index()
        .rename_axis(columns=None)
    )

    return df_wide


def process_trade_data() -> pd.DataFrame:
    """Create the full trade dataset ready for Observable consumption."""
    logger.info("Processing trade data")
    (
        product_code_to_section,
        group_to_iso3,
        _iso3_to_groups,
        membership_df,
    ) = load_mappings()

    df_wide = import_transform_trade(
        product_code_to_section
    )

    base_cols = ["year", "exporter_iso3", "importer_iso3"]

    df = df_wide.melt(
        id_vars=base_cols,
        var_name="category",
        value_name="value",
        ignore_index=True,
    ).dropna(subset=["value"])

    df_totals = (
        df.groupby(base_cols, as_index=False)["value"]
        .sum()
        .assign(category="All products")
    )

    df_full = pd.concat([df, df_totals], ignore_index=True)

    trade_df = add_currencies_and_prices(df_full, id_column="exporter_iso3")

    missing_map = {
        "SCG": "Serbia and Montenegro",
        "ANT": "Netherlands Antilles",
        "S19": "Asia, not else specified"
    }

    trade_df["exporter"] = resolve_places(
        trade_df["exporter_iso3"], from_type="iso3_code", to_type="name_short", not_found="ignore"
    ).fillna(trade_df["exporter_iso3"].map(missing_map))
    trade_df["importer"] = resolve_places(
        trade_df["importer_iso3"], from_type="iso3_code", to_type="name_short", not_found="ignore"
    ).fillna(trade_df["importer_iso3"].map(missing_map))

    trade_df = add_country_groups(trade_df, membership_df, group_to_iso3)

    trade_df = reshape_to_country_flow(trade_df)

    trade_df = convert_values_to_units(trade_df)

    return trade_df


def generate_input_values(trade_df: pd.DataFrame) -> None:
    """Materialise JS-ready data describing countries, groups, and HS categories."""

    logger.info("Generating input values file")

    with open(PATHS.COUNTRY_GROUPS, "r") as f:
        groups_to_iso3 = json.load(f)

    time_range = [min(trade_df["year"]), max(trade_df["year"])]
    unique_countries = sorted(trade_df["country"].unique())
    country_groups = sorted(groups_to_iso3.keys())
    unique_categories = sorted(trade_df["category"].unique())

    sections = [
        _list_to_js(time_range, "maxTimeRange"),
        _list_to_js(unique_countries, "countryOptions"),
        _list_to_js(country_groups, "countryGroups"),
        _list_to_js(unique_categories, "productCategories"),
    ]
    js_output = "\n".join(sections)

    path_to_save = PATHS.COMPONENTS / "inputValues.js"
    with open(path_to_save, "w", encoding="utf-8") as js_file:
        js_file.write(js_output)

    logger.info("Saving input values file to %s", path_to_save)


def _list_to_js(elements: list, var_name: str) -> str:
    """Format HS section names into a JavaScript array export."""
    items = ",\n".join(f'  "{e}"' for e in elements)
    return "\n".join(
        [
            f"export const {var_name} = [",
            items,
            "];",
        ]
    )


if __name__ == "__main__":
    df = process_trade_data()

    logger.info("Writing partitioned dataset...")
    write_partitioned_dataset(df, "trade", partition_cols=["country"])
    logger.info("Trade data completed")

    logger.info("Writing input values...")
    generate_input_values(df)
