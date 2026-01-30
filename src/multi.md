```js
import * as React from "npm:react";
import {NavMenu} from "./components/NavMenu.js";
import {DropdownMenu} from "./components/DropdownMenu.js";
import {RangeInput} from "./components/RangeInput.js";
import {ToggleSwitch} from "./components/ToggleSwitch.js";
import {SegmentedToggle} from "./components/SegmentedToggle.js";
import {MultiSelect} from "./components/MultiSelect.js";
import {TradePlot} from "./components/TradePlot.js";
import {RankTable} from "./components/RankTable.js";
import {multiQueries} from "./js/dataQueries.js";
import {setCustomColors} from "./js/colors.js";
import {downloadXLSX} from "./js/downloads.js";
import {generateFileName} from "./js/textGenerators.js";
import {maxTimeRange, productCategories, countryOptions} from "./js/inputValues.js";
```

```js
setCustomColors();
```

```jsx
const UNIT_OPTIONS = [
    {label: "US Dollars", value: "usd"},
    {label: "Canada Dollars", value: "cad"},
    {label: "Euros", value: "eur"},
    {label: "British pounds", value: "gbp"}
];

const FLOW_OPTIONS = [
    {label: "Balance", value: "balance"},
    {label: "Exports", value: "exports"},
    {label: "Imports", value: "imports"}
];

const MULTI_CATEGORY_OPTIONS = [
    {label: "All products", value: "All"},
    ...productCategories.filter((item) => item !== "All products").map((item) => ({label: item, value: item}))
];

function App() {
    const defaultTimeRange = React.useMemo(
        () => [Number(maxTimeRange[1]) - 10, Number(maxTimeRange[1])],
        []
    );

    const [selectedCountry, setSelectedCountry] = React.useState("Kenya");
    const [selectedPartners, setSelectedPartners] = React.useState(["Canada"]);
    const [selectedUnit, setSelectedUnit] = React.useState("usd");
    const [selectedCategory, setSelectedCategory] = React.useState("All");
    const [selectedPrices, setSelectedPrices] = React.useState("constant");
    const [selectedFlow, setSelectedFlow] = React.useState("balance");
    const [selectedTimeRange, setSelectedTimeRange] = React.useState(defaultTimeRange);

    const [plotData, setPlotData] = React.useState([]);
    const [tableData, setTableData] = React.useState([]);
    const [availablePartners, setAvailablePartners] = React.useState([]);
    const [dataStatus, setDataStatus] = React.useState({loading: false, error: null});

    React.useEffect(() => {
        setSelectedPartners((previous) => {
            if (!previous.includes(selectedCountry)) return previous;
            return previous.filter((partner) => partner !== selectedCountry);
        });
    }, [selectedCountry]);

    React.useEffect(() => {
        if (!selectedPartners.length) {
            setPlotData([]);
            setTableData([]);
            setAvailablePartners([]);
            setDataStatus({loading: false, error: null});
            return;
        }

        let cancelled = false;
        setDataStatus({loading: true, error: null});
        const query = multiQueries(
            selectedCountry,
            selectedPartners,
            selectedUnit,
            selectedPrices,
            selectedTimeRange,
            selectedCategory,
            selectedFlow
        );

        Promise.all([query.plot, query.table, query.availablePartners])
            .then(([plot, table, partnersAvailable]) => {
                if (cancelled) return;
                setPlotData(Array.isArray(plot) ? plot : []);
                setTableData(Array.isArray(table) ? table : []);
                setAvailablePartners(Array.isArray(partnersAvailable) ? partnersAvailable : []);
                setDataStatus({loading: false, error: null});
            })
            .catch((error) => {
                if (cancelled) return;
                console.error(error);
                setPlotData([]);
                setTableData([]);
                setAvailablePartners([]);
                setDataStatus({loading: false, error});
            });

        return () => {
            cancelled = true;
        };
    }, [selectedCountry, selectedPartners, selectedUnit, selectedPrices, selectedTimeRange, selectedCategory, selectedFlow]);

    const {loading, error} = dataStatus;
    const hasPartners = selectedPartners.length > 0;
    const isMultiPartner = selectedPartners.length > 1;

    const partnerOptions = React.useMemo(() => {
        const ready = availablePartners.length > 0;
        const availableSet = new Set(availablePartners);
        const selectedSet = new Set(selectedPartners);
        return countryOptions.map((option) => ({
            label: option,
            value: option,
            disabled: ready ? (!availableSet.has(option) && !selectedSet.has(option)) : false
        }));
    }, [availablePartners, selectedPartners]);

    const handlePlotDownload = React.useCallback(() => {
        if (!plotData.length || !selectedPartners.length) return;
        downloadXLSX(
            plotData,
            generateFileName({
                country: selectedCountry,
                partners: selectedPartners,
                category: selectedCategory,
                flow: selectedFlow,
                timeRange: selectedTimeRange,
                mode: "plot"
            })
        );
    }, [plotData, selectedCountry, selectedPartners, selectedCategory, selectedFlow, selectedTimeRange]);

    const handleTableDownload = React.useCallback(() => {
        if (!tableData.length || !selectedPartners.length) return;
        downloadXLSX(
            tableData,
            generateFileName({
                country: selectedCountry,
                partners: selectedPartners,
                category: selectedCategory,
                flow: selectedFlow,
                timeRange: selectedTimeRange,
                mode: "table-multi"
            })
        );
    }, [tableData, selectedCountry, selectedPartners, selectedCategory, selectedFlow, selectedTimeRange]);

    return (
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
            <NavMenu currentPage="multi-view" />
            <section className="p-6">
                <div className="grid gap-6 md:grid-cols-[repeat(2,minmax(0,45%))] md:justify-between">
                    <div className="flex flex-col gap-6">
                        <DropdownMenu
                            label="Country"
                            options={countryOptions}
                            value={selectedCountry}
                            onChange={setSelectedCountry}
                        />
                        <MultiSelect
                            label="Partner(s)"
                            options={partnerOptions}
                            value={selectedPartners}
                            onChange={setSelectedPartners}
                            disabledValues={[selectedCountry]}
                            maxSelected={5}
                        />
                    </div>
                    <div className="flex flex-col gap-6">
                        <DropdownMenu
                            label="Category"
                            options={MULTI_CATEGORY_OPTIONS}
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                        />
                        <DropdownMenu
                            label="Unit"
                            options={UNIT_OPTIONS}
                            value={selectedUnit}
                            onChange={setSelectedUnit}
                        />
                        <ToggleSwitch
                            label="Prices"
                            value={selectedPrices}
                            options={[
                                {label: "Constant", value: "constant"},
                                {label: "Current", value: "current"}
                            ]}
                            onChange={setSelectedPrices}
                        />
                        <SegmentedToggle
                            label="Trade flow"
                            value={selectedFlow}
                            options={FLOW_OPTIONS}
                            onChange={setSelectedFlow}
                            disabled={!isMultiPartner}
                            disabledReason="Select more than one country to filter trade flow"
                        />
                    </div>
                    <div className="flex flex-col gap-6">
                        <RangeInput
                            min={Number(maxTimeRange[0])}
                            max={Number(maxTimeRange[1])}
                            step={1}
                            label="Time range"
                            value={selectedTimeRange}
                            onChange={setSelectedTimeRange}
                        />
                    </div>
                </div>
            </section>
            {!hasPartners ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
                    Select at least one partner to view trade comparisons.
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="border-2 border-black bg-white p-6">
                        <TradePlot
                            data={plotData}
                            unit={selectedUnit}
                            flow={selectedFlow}
                            country={selectedCountry}
                            category={selectedCategory}
                            timeRange={selectedTimeRange}
                            prices={selectedPrices}
                            partners={selectedPartners}
                            isMultiPartner={isMultiPartner}
                            wide={false}
                            loading={loading}
                            error={error}
                            emptyMessage="No data for the selected filters."
                            onDownload={handlePlotDownload}
                        />
                    </section>
                    <RankTable
                        data={tableData}
                        flow={selectedFlow}
                        mainColumn="category"
                        mode="table-multi"
                        country={selectedCountry}
                        category={selectedCategory}
                        timeRange={selectedTimeRange}
                        unit={selectedUnit}
                        prices={selectedPrices}
                        partners={selectedPartners}
                        isMultiPartner={isMultiPartner}
                        multiMode={true}
                        loading={loading}
                        error={error}
                        emptyMessage="No comparison data for the selected filters."
                        onDownload={handleTableDownload}
                    />
                </div>
            )}
        </div>
    );
}

display(<App />);
```
