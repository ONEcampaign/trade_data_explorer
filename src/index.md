```js
import * as React from "npm:react";
import {NavMenu} from "./components/NavMenu.js";
import {RangeInput} from "./components/RangeInput.js";
import {DropdownMenu} from "./components/DropdownMenu.js";
import {ToggleSwitch} from "./components/ToggleSwitch.js";
import {TradePlot} from "./components/TradePlot.js";
import {RankTable} from "./components/RankTable.js";
import {singleQueries} from "./js/dataQueries.js"
import {setCustomColors} from "./js/colors.js"
import {downloadXLSX} from "./js/downloads.js"
import {generateFileName} from "./js/textGenerators.js"
import {maxTimeRange, productCategories, countryOptions} from "./js/inputValues.js";

const UNIT_OPTIONS = [
    {label: "US Dollars", value: "usd"},
    {label: "Canada Dollars", value: "cad"},
    {label: "Euros", value: "eur"},
    {label: "British pounds", value: "gbp"}
]

const PRICE_TOGGLE_OPTIONS = [
    {label: "Constant", value: "constant"},
    {label: "Current", value: "current"}
]

const FLOW_TOGGLE_OPTIONS = [
    {label: "Imports", value: "imports"},
    {label: "Exports", value: "exports"}
]

setCustomColors()
```

```jsx
function App() {

    const defaultCountry = "South Africa"
    const defaultTimeRange = React.useMemo(
        () => [Number(maxTimeRange[1] - 20), Number(maxTimeRange[1])],
        []
    )

    // Reactive variables
    const [selectedCountry, setSelectedCountry] = React.useState(defaultCountry)
    const [selectedCategory, setSelectedCategory] = React.useState("All products")
    const [selectedUnit, setSelectedUnit] = React.useState("usd")
    const [selectedPrices, setSelectedPrices] = React.useState("constant")
    const [selectedTimeRange, setSelectedTimeRange] = React.useState(defaultTimeRange)
    const [selectedFlow, setSelectedFlow] = React.useState("exports")

    const [worldTradeData, setWorldTradeData] = React.useState([])
    const [partnersData, setPartnersData] = React.useState([])
    const [categoriesData, setCategoriesData] = React.useState([])
    const [dataStatus, setDataStatus] = React.useState({loading: false, error: null})


    React.useEffect(() => {
        let cancelled = false
        setDataStatus({loading: true, error: null})
        const query = singleQueries(
            selectedCountry,
            selectedUnit,
            selectedPrices,
            selectedTimeRange,
            selectedCategory,
            selectedFlow,
            "All countries"
        )

        Promise.all([query.worldTrade, query.partners, query.categories])
            .then(([worldTrade, partners, categories]) => {
                if (cancelled) return
                setWorldTradeData(Array.isArray(worldTrade) ? worldTrade : [])
                setPartnersData(Array.isArray(partners) ? partners : [])
                setCategoriesData(Array.isArray(categories) ? categories : [])
                setDataStatus({loading: false, error: null})
            })
            .catch((error) => {
                if (cancelled) return
                console.error(error)
                setWorldTradeData([])
                setPartnersData([])
                setCategoriesData([])
                setDataStatus({loading: false, error})
            })

        return () => {
            cancelled = true
        }
    }, [selectedCountry, selectedUnit, selectedPrices, selectedTimeRange, selectedCategory, selectedFlow])

    const {loading, error} = dataStatus

    const handlePlotDownload = React.useCallback(() => {
        if (!worldTradeData.length) return
        downloadXLSX(
            worldTradeData,
            generateFileName({
                country: selectedCountry,
                partners: ["the world"],
                category: selectedCategory,
                flow: selectedFlow,
                timeRange: selectedTimeRange,
                mode: "plot"
            })
        )
    }, [worldTradeData, selectedCountry, selectedCategory, selectedFlow, selectedTimeRange])

    const handlePartnersDownload = React.useCallback(() => {
        if (!partnersData.length) return
        downloadXLSX(
            partnersData,
            generateFileName({
                country: selectedCountry,
                category: selectedCategory,
                timeRange: selectedTimeRange,
                flow: selectedFlow,
                mode: "table-partners"
            })
        )
    }, [partnersData, selectedCountry, selectedCategory, selectedTimeRange, selectedFlow])

    const handleCategoriesDownload = React.useCallback(() => {
        if (!categoriesData.length) return
        downloadXLSX(
            categoriesData,
            generateFileName({
                country: selectedCountry,
                timeRange: selectedTimeRange,
                flow: selectedFlow,
                mode: "table-categories"
            })
        )
    }, [categoriesData, selectedCountry, selectedTimeRange, selectedFlow])

    return (
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
            <NavMenu currentPage="single-view"/>
            <section className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="flex flex-col gap-6">
                        <DropdownMenu
                            label="Country"
                            options={countryOptions}
                            value={selectedCountry}
                            onChange={setSelectedCountry}
                        />
                        <DropdownMenu
                            label="Category"
                            options={productCategories}
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                        />
                    </div>
                    <div className="flex flex-col gap-6">
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
            <section className="border-2 border-black bg-white p-6">
                <TradePlot
                    data={worldTradeData}
                    unit={selectedUnit}
                    flow={selectedFlow}
                    country={selectedCountry}
                    category={selectedCategory}
                    timeRange={selectedTimeRange}
                    prices={selectedPrices}
                    loading={loading}
                    error={error}
                    emptyMessage="No data for the selected filters."
                    onDownload={handlePlotDownload}
                />
            </section>
            <div className="p-6">
                <ToggleSwitch
                    label="Trade flow"
                    value={selectedFlow}
                    options={FLOW_TOGGLE_OPTIONS}
                    onChange={setSelectedFlow}
                />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <RankTable
                    data={partnersData}
                    flow={selectedFlow}
                    mainColumn="partner"
                    mode="table-top-partners"
                    country={selectedCountry}
                    category={selectedCategory}
                    timeRange={selectedTimeRange}
                    unit={selectedUnit}
                    prices={selectedPrices}
                    group="All countries"
                    loading={loading}
                    error={error}
                    emptyMessage="No partner data for the selected filters."
                    onDownload={handlePartnersDownload}
                />
                <RankTable
                    data={categoriesData}
                    flow={selectedFlow}
                    mainColumn="category"
                    mode="table-top-categories"
                    country={selectedCountry}
                    category={selectedCategory}
                    timeRange={selectedTimeRange}
                    unit={selectedUnit}
                    prices={selectedPrices}
                    group="All countries"
                    loading={loading}
                    error={error}
                    emptyMessage="No category data for the selected filters."
                    onDownload={handleCategoriesDownload}
                />
            </div>
        </div>
    )
}

display(<App/>)
```
