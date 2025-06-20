import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Create terminal (stream) handler
shell_handler = logging.StreamHandler()
shell_handler.setLevel(logging.INFO)  # Set logging level for handler
# Define log format (optional but recommended)
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
shell_handler.setFormatter(formatter)
# Add the handler to the logger
logger.addHandler(shell_handler)
# Set logger level
logger.setLevel(logging.INFO)


base_year = 2023  # for currency conversions

time_range = [2002, 2023]

baci_version = "202501"


class PATHS:
    """Class to store the paths to the data."""

    SRC = Path(__file__).resolve().parent.parent

    SETTINGS = SRC / "data" / "settings"
    HS_SECTIONS = SETTINGS / "hs_sections.json"
    HS_CATEGORIES = SETTINGS / "hs_categories.json"
    COUNTRIES = SETTINGS / "countries.json"

    DATA = SRC / "data" / "raw_data"
    PYDEFLATE = DATA / "pydeflate"
    BACI = DATA / f"BACI_HS02_V{baci_version}"
    COUNTRY_CODES = BACI / f"country_codes_V{baci_version}.csv"

    COMPONENTS = SRC / "components"
