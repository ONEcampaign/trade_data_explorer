```js
import "./components/embed.js";
import {setCustomColors} from "./components/colors.js"
import {
    getUnitLabel,
    formatString,
    generateTitle,
    generateSubtitle,
    generateFooter,
    generateFileName
} from "./components/utils.js"
import {maxTimeRange, productCategories, countryOptions, countryGroups} from "./components/inputValues.js";
import {rangeInput} from "./components/rangeInput.js";
import {tradePlot, rankTable} from "./components/visuals.js";
import {downloadXLSX} from './components/downloads.js';
```

```js 
setCustomColors();
```

```js

const singleStateStore = globalThis.__singleState ??= {lastResult: null};

// USER INPUTS

const countries = countryOptions
const groupNames = countryGroups
const multiGroups = [
    "All countries",
    ...groupNames
];

// Country Input
const countryInput = Inputs.select(
    countries,
    {
        label: "Country",
        sort: true,
        value: "South Africa"
    })

const country = Generators.input(countryInput);

// Unit Input
const unitInput = Inputs.select(
    new Map([
        ["US Dollars", "usd"],
        ["Canada Dollars", "cad"],
        ["Euros", "eur"],
        ["British pounds", "gbp"],
    ]),
    {
        label: "Unit"
    }
);
const unit = Generators.input(unitInput)

// Flow input
const flowInput = Inputs.radio(
    new Map([
        ["Exports", "exports"],
        ["Imports", "imports"]
    ]),
    {
        label: "Trade flow",
        value: "exports"
    }
)
const flow = Generators.input(flowInput)

// Category Input
const categoryInput = Inputs.select(
    productCategories, {
        label: "Category",
        value: "All products"
    }
);
const category = Generators.input(categoryInput)

// Prices Input
const pricesInput = Inputs.radio(
    new Map([
        ["Constant", "constant"],
        ["Current", "current"]
    ]),
    {
        label: "Prices",
        value: "constant"
    }
);
const prices = Generators.input(pricesInput)

// Time Input
const timeRangeInput = rangeInput(
    {
        min: maxTimeRange[0],
        max: maxTimeRange[1],
        step: 1,
        value: [maxTimeRange[0], maxTimeRange[1]],
        label: "Time range",
        enableTextInput: true
    })
const timeRange = Generators.input(timeRangeInput)

// Country group input
const groupInput = Inputs.select(
    multiGroups,
    {
        label: "Country group",
        sort: true,
        value: "All countries"
    })

const group = Generators.input(groupInput);

```

```js

// DATA  QUERIES

import {singleQueries} from "./components/dataQueries.js"

const dataState = Generators.observe((notify) => {
    let cancelled = false;
    let spinnerTimeout = null;
    const emptyResult = {
        worldTradeData: [],
        partnersData: [],
        categoriesData: []
    };
    const lastResult = singleStateStore.lastResult;
    const pendingResult = lastResult ?? emptyResult;

    function cleanup() {
        if (spinnerTimeout != null) {
            clearTimeout(spinnerTimeout);
            spinnerTimeout = null;
        }
    }

    function emit(state) {
        if (!cancelled) {
            notify(state);
        }
    }

    emit({
        ...pendingResult,
        loading: true,
        showSpinner: false,
        error: null,
        hasData: false
    });

    const showSpinner = () => {
        if (cancelled) return;
        emit({
            ...pendingResult,
            loading: true,
            showSpinner: true,
            error: null,
            hasData: false
        });
    };

    spinnerTimeout = setTimeout(showSpinner, 0);

    const result = singleQueries(
        country,
        unit,
        prices,
        timeRange,
        category,
        flow,
        group
    );

    Promise.all([
        result.worldTrade,
        result.partners,
        result.categories
    ]).then(([worldTradeData, partnersData, categoriesData]) => {
        if (cancelled) return;
        cleanup();
        const resolved = {worldTradeData, partnersData, categoriesData};
        singleStateStore.lastResult = resolved;

        emit({
            ...resolved,
            loading: false,
            showSpinner: false,
            error: null,
            hasData: true
        });
    }).catch((error) => {
        if (cancelled) return;
        cleanup();
        console.error("Failed to load single country data", error);
        const fallback = lastResult ?? emptyResult;

        emit({
            ...fallback,
            loading: false,
            showSpinner: false,
            error,
            hasData: lastResult != null
        });
    });

    return () => {
        cancelled = true;
        cleanup();
    };
});
```

```js
const {
    loading: singleLoading,
    showSpinner: singleShowSpinner,
    error: singleError,
    hasData: singleHasData,
    worldTradeData = [],
    partnersData = [],
    categoriesData = []
} = dataState;
```

<div class="menu card">
    <a class="view-button active" href="./">
         Single Country
    </a>
    <a class="view-button" href="./multi">
        Multi Country
    </a>
    <a class="view-button" href="./faqs">
    FAQs
    </a>
</div>
<div>
    ${
        html`
            <div class="card settings">
                <div class="settings-group">
                    ${countryInput}
                </div>
                <div class="settings-group">
                    ${unitInput}
                    ${categoryInput}
                </div>
                <div class="settings-group">
                    ${pricesInput}
                    ${timeRangeInput}
                </div>
            </div>
            ${
                singleError
                    ? html`
                        <div class="card">
                            <div class="warning">
                                Failed to load data. Please try again.
                            </div>
                        </div>
                    `
                    : singleShowSpinner
                        ? html`
                            <div class="card loading-indicator" aria-live="polite">
                                <div class="spinner" role="status" aria-label="Loading data"></div>
                                <span>Loading data…</span>
                            </div>
                        `
                        : singleHasData 
                            ? html`
                                <div class="card">
                                    <div class="plot-container wide" id="single-plot">
                                        ${generateTitle({country: country, partners: ["the rest of the world"], mode: "plot"})}
                                        ${generateSubtitle({partners: [""], category: category, mode: "plot"})}
                                        ${resize((width) => tradePlot(worldTradeData, [""], unit, flow, width, {wide: true}))}
                                        ${await generateFooter({unit: unit, prices: prices, country: country})}
                                    </div>
                                    <div class="download-panel">
                                        ${
                                            Inputs.button(
                                                "Download data", {
                                                    reduce: () => downloadXLSX(
                                                        worldTradeData,
                                                        generateFileName({country:country, partners:["the world"], category:category, timeRange:timeRange, mode:"plot"})
                                                    )
                                                }
                                            )
                                        }
                                    </div>
                                </div>
                                <div class="card settings">
                                    <div class="settings-group">
                                        ${flowInput}
                                    </div>
                                    <!--
                                    <div class="settings-group">
                                        ${groupInput}
                                    </div>
                                    -->
                                </div>
                                <div class="grid grid-cols-2">
                                    <div class="card">
                                        <div class="plot-container">
                                            ${generateTitle({country: country, flow: flow, group: group, mode: "table-top-partners"})}
                                            ${generateSubtitle({category: category, timeRange: timeRange, unit: unit, mode: "table-top-partners"})}
                                            ${resize((width) => rankTable(partnersData, flow, 'partner', width))}
                                            ${await generateFooter({unit: unit, prices: prices, country: country, flow: flow, group: group, isGlobalTrade: true})}
                                        </div>
                                        <div class="download-panel">
                                            ${
                                                Inputs.button(
                                                    "Download data", {
                                                        reduce: () => downloadXLSX(
                                                            partnersData,
                                                            generateFileName({country: country, category:category, timeRange: timeRange, flow: flow, mode: "table-partners"})
                                                        )
                                                    }
                                                )
                                            }
                                        </div>
                                    </div>
                                    <div class="card">
                                        <div class="plot-container">
                                            ${generateTitle({country: country, flow: flow, group: group, mode: "table-top-categories"})}
                                            ${generateSubtitle({category: category, timeRange: timeRange, unit: unit, mode: "table-top-categories"})}
                                            ${resize((width) => rankTable(categoriesData, flow, 'category', width))}
                                            ${await generateFooter({unit: unit, prices: prices, country: country, flow: flow, group: group, isGlobalTrade: true})}
                                        </div>
                                        <div class="download-panel">
                                            ${
                                                Inputs.button(
                                                    "Download data", {
                                                        reduce: () => downloadXLSX(
                                                            categoriesData,
                                                            generateFileName({country: country, timeRange: timeRange, flow: flow, mode: "table-categories"})
                                                        )
                                                    }
                                                )
                                            }
                                        </div>
                                    </div>
                                </div>
                            `
                            : null
            }
        `
    }
</div>
