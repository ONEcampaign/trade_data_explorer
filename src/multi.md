```js
import "./js/embed.js"
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
import {productCategories, countryOptions, maxTimeRange} from "./js/inputValues.js";
import {UNIT_OPTIONS, MULTI_FLOW_OPTIONS, PRICE_TOGGLE_OPTIONS} from "./js/options.js";
import {downloadTradeData} from "./js/downloadHelpers.js";
import {DEFAULT_MULTI_COUNTRY, DEFAULT_MULTI_PARTNERS, getMultiDefaultTimeRange} from "./js/stateDefaults.js";
```

```js
setCustomColors();
```

```jsx
const MULTI_CATEGORY_OPTIONS = [
    {label: "All products", value: "All"},
    ...productCategories.filter((item) => item !== "All products").map((item) => ({label: item, value: item}))
];

function App() {
    const defaultTimeRange = React.useMemo(() => getMultiDefaultTimeRange(), []);

    const [selectedCountry, setSelectedCountry] = React.useState(DEFAULT_MULTI_COUNTRY);
    const [selectedPartners, setSelectedPartners] = React.useState(DEFAULT_MULTI_PARTNERS);
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
    const orderedPartners = React.useMemo(
        () => [...selectedPartners].sort((a, b) => String(a).localeCompare(String(b))),
        [selectedPartners]
    );

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
        downloadTradeData(plotData, {
            country: selectedCountry,
            partners: orderedPartners,
            category: selectedCategory,
            flow: selectedFlow,
            timeRange: selectedTimeRange,
            mode: "plot"
        });
    }, [plotData, selectedCountry, orderedPartners, selectedCategory, selectedFlow, selectedTimeRange]);

    const handleTableDownload = React.useCallback(() => {
        downloadTradeData(tableData, {
            country: selectedCountry,
            partners: orderedPartners,
            category: selectedCategory,
            flow: selectedFlow,
            timeRange: selectedTimeRange,
            mode: "table-multi"
        });
    }, [tableData, selectedCountry, orderedPartners, selectedCategory, selectedFlow, selectedTimeRange]);

    return (
        <div className="mx-auto w-full space-y-10 px-6 py-10">
            <NavMenu currentPage="multi-view" />
            <section className="p-4 sm:p-6">
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="flex flex-col items-stretch gap-6">
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
                    <div className="flex flex-col items-stretch gap-6">
                        <DropdownMenu
                            label="Unit"
                            options={UNIT_OPTIONS}
                            value={selectedUnit}
                            onChange={setSelectedUnit}
                        />
                        <ToggleSwitch
                            label="Prices"
                            value={selectedPrices}
                            options={PRICE_TOGGLE_OPTIONS}
                            onChange={setSelectedPrices}
                        />
                    </div>
                    <div className="flex flex-col items-stretch gap-6">
                        <DropdownMenu
                            label="Category"
                            options={MULTI_CATEGORY_OPTIONS}
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                        />
                        <RangeInput
                            min={Number(maxTimeRange[0])}
                            max={Number(maxTimeRange[1])}
                            step={1}
                            label="Time range"
                            value={selectedTimeRange}
                            onChange={setSelectedTimeRange}
                        />
                        <SegmentedToggle
                            label="Trade flow"
                            value={selectedFlow}
                            options={MULTI_FLOW_OPTIONS}
                            onChange={setSelectedFlow}
                            disabled={!isMultiPartner}
                            disabledReason="Select more than one country to filter trade flow"
                        />
                    </div>
                </div>
            </section>
            {!hasPartners ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 sm:p-6">
                    Select at least one partner to view data.
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
                    <div className="border border-black bg-white p-4 sm:p-6">
                        <TradePlot
                            data={plotData}
                            unit={selectedUnit}
                            flow={selectedFlow}
                            country={selectedCountry}
                            category={selectedCategory}
                            timeRange={selectedTimeRange}
                            prices={selectedPrices}
                            partners={orderedPartners}
                            isMultiPartner={isMultiPartner}
                            wide={false}
                            loading={loading}
                            error={error}
                            emptyMessage="No data for the selected filters."
                            onDownload={handlePlotDownload}
                        />
                    </div>
                    <div className="border border-black bg-white p-4 sm:p-6">
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
                            partners={orderedPartners}
                            isMultiPartner={isMultiPartner}
                            multiMode={true}
                            loading={loading}
                            error={error}
                            emptyMessage="No comparison data for the selected filters."
                            onDownload={handleTableDownload}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

display(<App />);
```
