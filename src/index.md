```js
import * as React from "npm:react"
import {Header} from "npm:@one-data/observable-themes/ui"
import {ONEVisual, AutoPlot, AutoTable} from "npm:@one-data/observable-themes/charts"
import {RangeInput, DropdownMenu, ToggleSwitch, SegmentedToggle} from "npm:@one-data/observable-themes/inputs"
import {APP_TITLE, APP_DESCRIPTION, NAV_ITEMS, SCALE} from "./js/config.js"
import {singleQueries} from "./js/dataQueries.js"
import {setCustomColors, customPalette} from "./js/colors.js"
import {productCategories, countryOptions, maxTimeRange} from "./js/inputValues.js"
import {UNIT_OPTIONS, PRICE_TOGGLE_OPTIONS, FLOW_OPTIONS} from "./js/options.js"
import {DEFAULT_SINGLE_COUNTRY, getSingleDefaultTimeRange} from "./js/stateDefaults.js"
import {
    generateTitle,
    generateSubtitle,
    generateFooterText,
    generateFileName,
    buildChartSubtitleHTML
} from "./js/textGenerators.js"
import {baseViz} from "./js/tradeChart.js"
import {baseTable} from "./js/tradeTable.js"
import {isEmbedded, resolveScale} from "npm:@one-data/observable-themes/utils"
import {formatString} from "./js/utils.js"


setCustomColors()
```

```jsx
const WORLD_PARTNERS = ["the rest of the world"]

function App() {
    const defaultTimeRange = React.useMemo(() => getSingleDefaultTimeRange(), [])

    const [selectedCountry, setSelectedCountry] = React.useState(DEFAULT_SINGLE_COUNTRY)
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

    const chartSubtitleHTML = React.useMemo(() => {
        const struct = generateSubtitle({
            partners: WORLD_PARTNERS,
            flow: selectedFlow,
            category: selectedCategory,
            timeRange: selectedTimeRange,
            mode: "chart"
        })
        return buildChartSubtitleHTML(struct, {palette: customPalette}) ?? struct.text
    }, [selectedCategory, selectedTimeRange])

    const chartFooter = React.useMemo(
        () => generateFooterText({
            unit: selectedUnit,
            prices: selectedPrices,
            country: selectedCountry,
            flow: selectedFlow,
            isMultiPartner: false
        }),
        [selectedUnit, selectedPrices, selectedCountry, selectedFlow]
    )

    const chartScale = React.useMemo(() => {
        const values = worldTradeData.flatMap(d => [d.imports, d.exports].filter(v => v != null && v > 0))
        return values.length ? resolveScale(values, SCALE) : null
    }, [worldTradeData])

    const chartFn = React.useCallback(
        (width) => baseViz(worldTradeData, WORLD_PARTNERS, selectedUnit, selectedFlow, width, {
            wide: false,
            scale: chartScale
        }),
        [worldTradeData, selectedUnit, selectedFlow, chartScale]
    )
    
    

    const extract = (d) => [d.imports, d.exports, d.balance].filter(v => v != null).map(Math.abs)

    const partnersScale = React.useMemo(() => {
        const values = partnersData.flatMap(extract).filter(v => v > 0)
        return values.length ? resolveScale(values, SCALE) : null
    }, [partnersData])

    const categoriesScale = React.useMemo(() => {
        const values = categoriesData.flatMap(extract).filter(v => v > 0)
        return values.length ? resolveScale(values, SCALE) : null
    }, [categoriesData])

    const partnersSubtitle = React.useMemo(
        () => generateSubtitle({
            category: selectedCategory,
            timeRange: selectedTimeRange,
            flow: selectedFlow,
            mode: "table-top-partners"
        }),
        [selectedCategory, selectedTimeRange, selectedFlow]
    )

    const partnersFn = React.useCallback(
        () => baseTable(partnersData, null, "partner", null, {allFlows: true, scale: partnersScale, unit: selectedUnit}),
        [partnersData, partnersScale, selectedUnit]
    )

    const categoriesSubtitle = React.useMemo(
        () => generateSubtitle({
            category: selectedCategory,
            timeRange: selectedTimeRange,
            flow: selectedFlow,
            mode: "table-top-categories"
        }),
        [selectedCategory, selectedTimeRange, selectedFlow]
    )

    const categoriesFn = React.useCallback(
        () => baseTable(categoriesData, null, "category", null, {allFlows: true, scale: categoriesScale, unit: selectedUnit}),
        [categoriesData, categoriesScale, selectedUnit]
    )

    return (
        <div className="mx-auto space-y-12 px-4 py-10 sm:px-8 sm:py-16 lg:px-12 lg:py-20">

            <Header 
                appTitle={APP_TITLE} 
                appDescription={APP_DESCRIPTION} 
                navItems={NAV_ITEMS} 
                currentPage="single" 
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
                        <DropdownMenu 
                            label="Category" 
                            options={productCategories} 
                            value={selectedCategory}
                            onChange={setSelectedCategory} 
                            search={true}
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
            </div>

            <div className="max-w-[1000px] mx-auto">
                <ONEVisual
                    title={generateTitle({
                        country: selectedCountry,
                        partners: WORLD_PARTNERS,
                        flow: selectedFlow,
                        mode: "chart"
                    })}
                    subtitle={chartSubtitleHTML}
                    subtitleIsHTML={true}
                    source={chartFooter.source}
                    note={chartFooter.sentences.join(" ")}
                    loading={loading}
                    error={error}
                    empty={worldTradeData.length === 0}
                    emptyMessage="No data for the selected filters."
                    fileName={generateFileName({
                        country: selectedCountry,
                        partners: WORLD_PARTNERS,
                        category: selectedCategory,
                        flow: selectedFlow,
                        timeRange: selectedTimeRange,
                        mode: "chart"
                    })}
                    data={worldTradeData}
                    imageDownload={true}
                    dataDownload={true}
                >
                    <AutoPlot data={worldTradeData} plotFn={chartFn}/>
                </ONEVisual>
            </div>

            <div className="grid gap-10 lg:grid-cols-2">
                <ONEVisual
                    title={`${formatString(selectedCountry, {genitive:true})} top trading partners`}
                    subtitle={partnersSubtitle.text}
                    source={chartFooter.source}
                    note={chartFooter.sentences.join(" ")}
                    loading={loading}
                    error={error}
                    empty={partnersData.length === 0}
                    emptyMessage="No partner data for the selected filters."
                    fileName={generateFileName({
                        country: selectedCountry,
                        partners: WORLD_PARTNERS,
                        category: selectedCategory,
                        flow: selectedFlow,
                        timeRange: selectedTimeRange,
                        mode: "table-partners"
                    })}
                    data={partnersData}
                    dataDownload={true}
                >
                    <AutoTable data={partnersData} tableFn={partnersFn}/>
                </ONEVisual>
                <ONEVisual
                    title={`${formatString(selectedCountry, {genitive:true})} top traded product categories`}
                    subtitle={categoriesSubtitle.text}
                    source={chartFooter.source}
                    note={chartFooter.sentences.join(" ")}
                    loading={loading}
                    error={error}
                    empty={categoriesData.length === 0}
                    emptyMessage="No category data for the selected filters."
                    fileName={generateFileName({
                        country: selectedCountry,
                        partners: WORLD_PARTNERS,
                        category: selectedCategory,
                        flow: selectedFlow,
                        timeRange: selectedTimeRange,
                        mode: "table-categories"
                    })}
                    data={categoriesData}
                    dataDownload={true}
                >
                    <AutoTable data={categoriesData} tableFn={categoriesFn}/>
                </ONEVisual>
            </div>
        </div>
                
    )}

    display(<App/>)
```
