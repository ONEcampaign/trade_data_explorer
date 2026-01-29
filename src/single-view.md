```js
import * as React from "npm:react";
import {NavMenu} from "./components/NavMenu.js";
import {RangeInput} from "./components/RangeInput.js";
import {DropdownMenu} from "./components/DropdownMenu.js";
import {ToggleSwitch} from "./components/ToggleSwitch.js";
import {TradePlot} from "./components/TradePlot.js";
import {singleQueries} from "./js/dataQueries.js"
import {setCustomColors} from "./js/colors.js"
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

        query.worldTrade
            .then((data) => {
                if (cancelled) return
                setWorldTradeData(Array.isArray(data) ? data : [])
                setDataStatus({loading: false, error: null})
            })
            .catch((error) => {
                if (cancelled) return
                console.error(error)
                setWorldTradeData([])
                setDataStatus({loading: false, error})
            })

        return () => {
            cancelled = true
        }
    }, [selectedCountry, selectedUnit, selectedPrices, selectedTimeRange, selectedCategory, selectedFlow])

    const {loading, error} = dataStatus

    return (
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
            <NavMenu currentPage="single-view"/>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                </div>
                <div className="mt-6">
                    <RangeInput
                        min={Number(maxTimeRange[0])}
                        max={Number(maxTimeRange[1])}
                        step={1}
                        label="Time range"
                        value={selectedTimeRange}
                        onChange={setSelectedTimeRange}
                    />
                </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                />
            </section>
        </div>
    )
}

display(<App/>)
```
