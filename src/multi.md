```js
import "./js/embed.js";
import {setCustomColors} from "./js/colors.js"
import {
    getUnitLabel,
    formatString,
    generateTitle,
    generateSubtitle,
    generateFooter,
    generateFileName
} from "./js/utils.js"
import {maxTimeRange, productCategories, countryOptions} from "./js/inputValues.js";
import {rangeInput} from "./js/rangeInput.js";
import {multiSelect} from "./js/multiSelect.js";
import {tradePlot, tradeTable} from "./js/visuals.js";
import {downloadXLSX} from './js/downloads.js';
```

```js 
setCustomColors();
```

```js

const multiStateStore = globalThis.__multiState ??= {lastResult: null};

```

```js

// USER INPUTS

const countries = countryOptions

// Country
const countryInput = Inputs.select(
    countries,
    {
        label: "Country",
        sort: true,
        value: "Kenya"
    })

// Partner
const partnersInput = multiSelect(
    countries,
    {
        label: "Partner(s)",
        value: ["Canada"]
    })

// Disable options condionally
function updateOptions() {

    const selectedCountry = countryInput.value;
    const partnerValues = Array.isArray(partnersInput.value) ? partnersInput.value : [];

    if (partnerValues.includes(selectedCountry)) {
        partnersInput.value = partnerValues.filter((value) => value !== selectedCountry);
    }

    for (const option of partnersInput.querySelectorAll("option")) {
        if (option.value === selectedCountry) {
            option.setAttribute("disabled", "disabled");
        } else {
            option.removeAttribute("disabled");
        }
    }
}

updateOptions();
countryInput.addEventListener("input", updateOptions);
partnersInput.addEventListener("input", updateOptions);

const country = Generators.input(countryInput);
const partners = Generators.input(partnersInput);

// Unit
const unitInput = Inputs.select(
    new Map([
        ["US Dollars", "usd"],
        ["Canada Dollars", "cad"],
        ["Euros", "eur"],
        ["British pounds", "gbp"],
    ]),
    {
        label: "Unit",
        value: "US Dollars"
    }
);
const unit = Generators.input(unitInput)

// Flow
const flowInput = Inputs.select(
    new Map([
        ["Trade balance", "balance"],
        ["Exports", "exports"],
        ["Imports", "imports"]
    ]),
    {
        label: "Trade flow",
        value: "balance"
    }
)
const flow = Generators.input(flowInput)

// Product category
const categoryInput = Inputs.select(
    ["All", ...productCategories], {
        label: "Category",
        value: "All"
    }
);
const category = Generators.input(categoryInput)

// Prices
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

// Time range
const timeRangeInput = rangeInput(
    {
        min: maxTimeRange[0],
        max: maxTimeRange[1],
        step: 1,
        value: [maxTimeRange[1] - 10, maxTimeRange[1]],
        label: "Time range",
        enableTextInput: true
    })
const timeRange = Generators.input(timeRangeInput)
```

```js
const isMultiPartner = partners.length > 1
```

```js

// DATA  QUERIES

import {multiQueries} from "./js/dataQueries.js"

const dataState = Generators.observe((notify) => {
    let cancelled = false;
    let spinnerTimeout = null;
    const emptyResult = {
        plotData: [],
        tableData: []
    };
    const lastResult = multiStateStore.lastResult;
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

    if (partners.length === 0) {
        emit({
            ...emptyResult,
            loading: false,
            showSpinner: false,
            error: null,
            hasData: false
        });

        return () => {
            cancelled = true;
            cleanup();
        };
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

    const result = multiQueries(
        country,
        partners,
        unit,
        prices,
        timeRange,
        category,
        flow
    );

    Promise.all([
        result.plot,
        result.table
    ]).then(([plotData, tableData]) => {
        if (cancelled) return;
        cleanup();
        const resolved = {plotData, tableData};
        multiStateStore.lastResult = resolved;

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
        console.error("Failed to load multi-country data", error);
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
    loading: multiLoading,
    showSpinner: multiShowSpinner,
    error: multiError,
    hasData: multiHasData,
    plotData = [],
    tableData = []
} = dataState;
```

<div class="menu card">
    <a class="view-button" href="./">
        Single Country
    </a>
    <a class="view-button active" href="./multi">
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
                    ${partnersInput}
                </div>
                <div class="settings-group">
                    ${unitInput}
                    ${categoryInput}
                </div>
                <div class="settings-group">
                    ${pricesInput}
                    ${timeRangeInput}
                    ${isMultiPartner ? flowInput : html` `}
                </div>
            </div>
            ${ 
                partners.length === 0 
                ? html`
                    <div class="grid grid-cols-2">
                        <div class="card"> 
                            <div class="warning">
                                Select at least one partner
                            </div>
                        </div>
                    </div>
                `
                : multiError
                    ? html`
                        <div class="card">
                            <div class="warning">
                                Failed to load data. Please try again.
                            </div>
                        </div>
                    `
                    : multiShowSpinner
                        ? html`
                            <div class="card loading-indicator" aria-live="polite">
                                <div class="spinner" role="status" aria-label="Loading data"></div>
                                <span>Loading data…</span>
                            </div>
                        `
                        : multiHasData
                            ? html`
                                <div class="grid grid-cols-2">
                                    <div class="card">
                                        <div class="plot-container" id="multi-plot">
                                            ${generateTitle({country: country, partners: partners, flow: flow, mode: "plot"})}
                                            ${generateSubtitle({partners: partners, flow: flow, category: category, mode: "plot"})}
                                            ${resize((width) => tradePlot(plotData, partners, unit, flow, width, {}))}
                                            ${await generateFooter({unit: unit, prices: prices, country: country, flow: flow, isMultiPartner: isMultiPartner})}
                                        </div>
                                        <div class="download-panel">
                                            ${
                                                Inputs.button(
                                                    "Download data", {
                                                        reduce: () => downloadXLSX(
                                                            plotData,
                                                            generateFileName({country:country, partners:partners, category:category, flow:flow, timeRange:timeRange, mode:"plot"})
                                                        )
                                                    }
                                                )
                                            }
                                        </div>
                                    </div>
                                    <div class="card">
                                        <div class="plot-container" id="multi-table">
                                            ${generateTitle({country: country, partners: partners, flow: flow, mode: "plot"})}
                                            ${generateSubtitle({category: category, timeRange: timeRange, unit: unit, mode: "table-multi"})}
                                            ${resize((width) => tradeTable(tableData, flow, width))}
                                            ${await generateFooter({unit: unit, prices: prices, country: country, flow: flow, isMultiPartner: isMultiPartner})}
                                        </div>
                                        <div class="download-panel">
                                                ${
                                                    Inputs.button(
                                                        "Download data", {
                                                            reduce: () => downloadXLSX(
                                                                tableData,
                                                                generateFileName({country:country, partners:partners, category:category, flow:flow, timeRange:timeRange, mode:"table-multi"})
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
