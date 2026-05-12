```js
import * as React from "npm:react"
import { Header } from "npm:@one-data/observable-themes/ui"
import { ONEVisual, AutoPlot, AutoTable } from "npm:@one-data/observable-themes/charts"
import { DropdownMenu, RangeInput, ToggleSwitch, SegmentedToggle, MultiSelect } from "npm:@one-data/observable-themes/inputs"
import { APP_TITLE, APP_DESCRIPTION, NAV_ITEMS, SCALE } from "./js/config.js"
import { multiQueries } from "./js/dataQueries.js"
import { setCustomColors, customPalette, multiPalette } from "./js/colors.js"
import { productCategories, countryOptions, maxTimeRange } from "./js/inputValues.js"
import { UNIT_OPTIONS, MULTI_FLOW_OPTIONS, PRICE_TOGGLE_OPTIONS } from "./js/options.js"
import { DEFAULT_MULTI_COUNTRY, DEFAULT_MULTI_PARTNERS, getMultiDefaultTimeRange } from "./js/stateDefaults.js"
import { generateTitle, generateSubtitle, generateFooterText, generateFileName, buildChartSubtitleHTML } from "./js/textGenerators.js"
import {baseViz} from "./js/tradeChart.js"
import {baseTable} from "./js/tradeTable.js"
import { isEmbedded, resolveScale } from "npm:@one-data/observable-themes/utils"

setCustomColors()

const MULTI_CATEGORY_OPTIONS = [
    {label: "All products", value: "All"},
    ...productCategories.filter((item) => item !== "All products").map((item) => ({label: item, value: item}))
]
```

```jsx
function App() {
    const defaultTimeRange = React.useMemo(() => getMultiDefaultTimeRange(), [])

    const [selectedCountry, setSelectedCountry] = React.useState(DEFAULT_MULTI_COUNTRY)
    const [selectedPartners, setSelectedPartners] = React.useState(DEFAULT_MULTI_PARTNERS)
    const [selectedUnit, setSelectedUnit] = React.useState("usd")
    const [selectedCategory, setSelectedCategory] = React.useState("All")
    const [selectedPrices, setSelectedPrices] = React.useState("constant")
    const [selectedFlow, setSelectedFlow] = React.useState("balance")
    const [selectedTimeRange, setSelectedTimeRange] = React.useState(defaultTimeRange)

    const [chartData, setChartData] = React.useState([])
    const [tableData, setTableData] = React.useState([])
    const [availablePartners, setAvailablePartners] = React.useState([])
    const [dataStatus, setDataStatus] = React.useState({loading: false, error: null})

    React.useEffect(() => {
        setSelectedPartners((previous) => {
            if (!previous.includes(selectedCountry)) return previous
            return previous.filter((partner) => partner !== selectedCountry)
        })
    }, [selectedCountry])

    React.useEffect(() => {
        if (!selectedPartners.length) {
            setChartData([])
            setTableData([])
            setDataStatus({loading: false, error: null})
            return
        }

        let cancelled = false
        setDataStatus({loading: true, error: null})
        const query = multiQueries(
            selectedCountry,
            selectedPartners,
            selectedUnit,
            selectedPrices,
            selectedTimeRange,
            selectedCategory,
            selectedFlow
        )

        Promise.all([query.plot, query.table, query.availablePartners])
            .then(([chart, table, partnersAvailable]) => {
                if (cancelled) return
                setChartData(Array.isArray(chart) ? chart : [])
                setTableData(Array.isArray(table) ? table : [])
                setAvailablePartners(Array.isArray(partnersAvailable) ? partnersAvailable : [])
                setDataStatus({loading: false, error: null})
            })
            .catch((error) => {
                if (cancelled) return
                console.error(error)
                setChartData([])
                setTableData([])
                setAvailablePartners([])
                setDataStatus({loading: false, error})
            })

        return () => { cancelled = true }
    }, [selectedCountry, selectedPartners, selectedUnit, selectedPrices, selectedTimeRange, selectedCategory, selectedFlow])

    const {loading, error} = dataStatus
    const hasPartners = selectedPartners.length > 0
    const isMultiPartner = selectedPartners.length > 1

    const orderedPartners = React.useMemo(
        () => [...selectedPartners].sort((a, b) => String(a).localeCompare(String(b))),
        [selectedPartners]
    )

    const partnerOptions = React.useMemo(() => {
        const ready = availablePartners.length > 0
        const availableSet = new Set(availablePartners)
        const selectedSet = new Set(selectedPartners)
        return countryOptions.map((option) => ({
            label: option,
            value: option,
            disabled: ready ? (!availableSet.has(option) && !selectedSet.has(option)) : false
        }))
    }, [availablePartners, selectedPartners])

    const partnerLegend = React.useMemo(() => {
        if (!isMultiPartner) return []
        const source = chartData.length
            ? [...new Set(chartData.map(d => d?.partner).filter(Boolean))].sort((a, b) => a.localeCompare(b))
            : orderedPartners
        return source.map((partner, i) => ({partner, color: multiPalette[i % multiPalette.length]}))
    }, [isMultiPartner, chartData, orderedPartners])

    const chartSubtitleHTML = React.useMemo(() => {
        const struct = generateSubtitle({partners: orderedPartners, flow: selectedFlow, category: selectedCategory, timeRange: selectedTimeRange, mode: "chart"})
        return buildChartSubtitleHTML(struct, {partnerLegend, flow: selectedFlow, palette: customPalette}) ?? struct.text
    }, [orderedPartners, selectedFlow, selectedCategory, selectedTimeRange, partnerLegend])

    const chartFooter = React.useMemo(
        () => generateFooterText({unit: selectedUnit, prices: selectedPrices, country: selectedCountry, flow: selectedFlow, isMultiPartner}),
        [selectedUnit, selectedPrices, selectedCountry, selectedFlow, isMultiPartner]
    )

    const chartScale = React.useMemo(() => {
        const values = chartData.flatMap(d => [d.imports, d.exports].filter(v => v != null && v > 0))
        return values.length ? resolveScale(values, SCALE) : null
    }, [chartData])

    const chartFn = React.useCallback(
        (width) => baseViz(chartData, orderedPartners, selectedUnit, selectedFlow, width, {wide: false, scale: chartScale}),
        [chartData, orderedPartners, selectedUnit, selectedFlow, chartScale]
    )

    const tableScale = React.useMemo(() => {
        const values = tableData
            .flatMap(d => isMultiPartner
                ? [d[selectedFlow]]
                : [d.imports, d.exports, d.balance]
            )
            .filter(v => v != null)
            .map(Math.abs)
            .filter(v => v > 0)
        return values.length ? resolveScale(values, SCALE) : null
    }, [tableData, isMultiPartner, selectedFlow])

    const tableSubtitle = React.useMemo(
        () => generateSubtitle({category: selectedCategory, timeRange: selectedTimeRange, flow: selectedFlow, mode: "table-multi"}),
        [selectedCategory, selectedTimeRange, selectedFlow]
    )

    const tableFn = React.useCallback(
        () => baseTable(tableData, selectedFlow, "category", null, {partners: orderedPartners, multiMode: true, scale: tableScale, unit: selectedUnit}),
        [tableData, selectedFlow, orderedPartners, tableScale, selectedUnit]
    )

    return (
        <div className="mx-auto space-y-12 px-4 py-10 sm:px-8 sm:py-16 lg:px-12 lg:py-20">

            <Header 
                appTitle={APP_TITLE} 
                appDescription={APP_DESCRIPTION} 
                navItems={NAV_ITEMS} 
                currentPage="multi" 
                descriptionMaxWidth={700}
            />

            <div className="flex flex-col gap-4">
                <h3 className="section-header">REFINE YOUR VIEW</h3>
                <div className="grid gap-6 md:grid-cols-3 pl-6">
                    <div className="flex flex-col items-stretch gap-6">
                        <DropdownMenu 
                            label="Country" 
                            options={countryOptions} 
                            value={selectedCountry} 
                            onChange={setSelectedCountry} 
                            search={true}
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
                            hint="Constant prices adjust for inflation, allowing you to compare values over time. Current prices reflect values at the time."
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
                            step={1} label="Time range"
                            value={selectedTimeRange} 
                            onChange={setSelectedTimeRange}
                        />
                        <SegmentedToggle
                            label="Trade flow"
                            value={selectedFlow}
                            options={MULTI_FLOW_OPTIONS}
                            onChange={setSelectedFlow}
                            disabled={!isMultiPartner}
                            disabledReason="Select more than one partner to filter trade flow"
                        />
                    </div>
                </div>
            </div>

            {!hasPartners ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 sm:p-6">
                    Select at least one partner to view data.
                </div>
            ) : (
                <div className="grid gap-10 lg:grid-cols-2">
                    <ONEVisual
                        title={generateTitle({country: selectedCountry, partners: orderedPartners, flow: selectedFlow, mode: "chart"})}
                        subtitle={chartSubtitleHTML}
                        subtitleIsHTML={true}
                        source={chartFooter.source}
                        note={chartFooter.sentences.join(" ")}
                        loading={loading}
                        error={error}
                        empty={chartData.length === 0}
                        emptyMessage="No data for the selected filters."
                        fileName={generateFileName({country: selectedCountry, partners: orderedPartners, category: selectedCategory, flow: selectedFlow, timeRange: selectedTimeRange, mode: "chart"})}
                        data={chartData}
                        imageDownload={true}
                        dataDownload={true}
                    >
                        <AutoPlot data={chartData} plotFn={chartFn}/>
                    </ONEVisual>
                    <ONEVisual
                        title={generateTitle({country: selectedCountry, partners: orderedPartners, flow: selectedFlow, mode: "chart"})}
                        subtitle={tableSubtitle.text}
                        source={chartFooter.source}
                        note={chartFooter.sentences.join(" ")}
                        loading={loading}
                        error={error}
                        empty={tableData.length === 0}
                        emptyMessage="No comparison data for the selected filters."
                        fileName={generateFileName({country: selectedCountry, partners: orderedPartners, category: selectedCategory, flow: selectedFlow, timeRange: selectedTimeRange, mode: "table-multi"})}
                        data={tableData}
                        dataDownload={true}
                    >
                        <AutoTable data={tableData} tableFn={tableFn}/>
                    </ONEVisual>
                </div>
            )}
        </div>
    )
}

display(<App/>)
```
