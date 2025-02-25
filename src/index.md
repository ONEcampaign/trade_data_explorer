```js
import {DuckDBClient} from "npm:@observablehq/duckdb";

import {setCustomColors} from "./components/colors.js"
import {getUnitLabel, formatString, generateSubtitle} from "./components/utils.js"
import {timeRange, categories, groupMappings} from "./components/inputValues.js";

import {rangeInput} from "./components/rangeInput.js";
import {multiSelect} from "./components/multiSelect.js";

import {plotSingle, plotMulti, tableSingle, tableMulti} from "./components/visuals.js";

import {downloadPNG, downloadXLSX} from './components/downloads.js';
```

```js 
setCustomColors();
```

```js
const db = DuckDBClient.of({
    trade: FileAttachment("./data/scripts/trade.parquet"),
    current_conversion_table: FileAttachment("./data/scripts/current_conversion_table.csv"),
    constant_conversion_table: FileAttachment("./data/scripts/constant_conversion_table.csv"),
    gdp_table: FileAttachment("./data/scripts/gdp_table.csv"),
});
```

```js
// USER INPUTS

const countries = Object.keys(groupMappings)
const groups = Object.values(groupMappings)

// SINGLE COUNTRY VIEW
// Country Input
const countrySingleInput = Inputs.select(
    countries,
    {
        label: "Country",
        sort: true,
        value: "African countries"
    })

// Partner Input
const partnerSingleInput = Inputs.select(
    countries,
    {
        label: "Partner",
        sort: true,
        value: "France"
    }
);

function updateOptionsSingle() {

    const countryList = groupMappings[countrySingleInput.value]
    const partnerList = groupMappings[partnerSingleInput.value]
    if (countryList.some(country => partnerList.includes(country))) {
        partnerSingleInput.value = countries
            .find(group => {
                let elements = groupMappings[group] || [group];
                return !elements.some(country => countryList.includes(country));
            })
            // Pick 5 random items that don't overlap
            .sort(() => Math.random() - 0.5)
            .slice(0, 1);
    }
    for (const o of partnerSingleInput.querySelectorAll("option")) {
        const groupList = groups[o.value]
        if (countryList.some(item => groupList.includes(item))) {
            o.setAttribute("disabled", "disabled");
        } else o.removeAttribute("disabled");
    }

    for (const o of countrySingleInput.querySelectorAll("option")) {
        const groupList = groups[o.value]
        if (groupList.some(item => partnerList.includes(item))) {
            o.setAttribute("disabled", "disabled");
        } else o.removeAttribute("disabled");
    }

}

updateOptionsSingle();
countrySingleInput.addEventListener("input", updateOptionsSingle);
partnerSingleInput.addEventListener("input", updateOptionsSingle);

const countrySingle = Generators.input(countrySingleInput);
const partnerSingle = Generators.input(partnerSingleInput);

// Unit Input
const unitSingleInput = Inputs.select(
    new Map([
        ["US Dollars", "usd"],
        ["Canada Dollars", "cad"],
        ["Euros", "eur"],
        ["British pounds", "gbp"],
        ["Share of GDP", "gdp"]
    ]),
    {
        label: "Unit"
    }
);
const unitSingle = Generators.input(unitSingleInput)

// Category Input
const categorySingleInput = Inputs.select(
    ["All", ...categories], {
        label: "Category",
        value: "All"
    }
);
const categorySingle = Generators.input(categorySingleInput)

// Prices Input
const pricesSingleInput = Inputs.radio(
    new Map([
        ["Constant", "constant"],
        ["Current", "current"]
    ]),
    {
        label: "Prices",
        value: "constant"
    }
);
const pricesSingle = Generators.input(pricesSingleInput)

// Time Input
const timeRangeSingleInput = rangeInput(
    {
        min: timeRange[0],
        max: timeRange[1],
        step: 1,
        value: [timeRange[1] - 10, timeRange[1]],
        label: "Time range",
        enableTextInput: true
    })
const timeRangeSingle = Generators.input(timeRangeSingleInput)

// MULTI COUNTRY VIEW
// Country Input
const countryMultiInput = Inputs.select(
    countries,
    {
        label: "Country",
        sort: true,
        value: "Canada"
    })

const partnersMultiInput = multiSelect(
    countries,
    {
        label: "Partners",
        value: ["South Africa", "Kenya", "Nigeria"]
    })


function updateOptionsMulti() {

    const countryList = groupMappings[countryMultiInput.value]
    const partnerList = partnersMultiInput.value.flatMap(group => groupMappings[group] || [group]);
    if (countryList.some(country => partnerList.includes(country))) {
        partnersMultiInput.value = countries
            .filter(group => {
                let elements = groupMappings[group] || [group];
                return !elements.some(country => countryList.includes(country));
            })
            // Pick 5 random items that don't overlap
            .sort(() => Math.random() - 0.5)
            .slice(0, 5);
    }

    for (const o of partnersMultiInput.querySelectorAll("option")) {
        const groupList = groupMappings[o.value]
        if (groupList.some(item => countryList.includes(item))) {
            o.setAttribute("disabled", "disabled");
        } else o.removeAttribute("disabled");
    }

    for (const o of countryMultiInput.querySelectorAll("option")) {
        const groupList = groups[o.value]
        if (groupList.some(item => partnerList.includes(item))) {
            o.setAttribute("disabled", "disabled");
        } else o.removeAttribute("disabled");
    }

}

updateOptionsMulti();
countryMultiInput.addEventListener("input", updateOptionsMulti);
partnersMultiInput.addEventListener("input", updateOptionsMulti);

const countryMulti = Generators.input(countryMultiInput);
const partnersMulti = Generators.input(partnersMultiInput);

// Unit Input
const unitMultiInput = Inputs.select(
    new Map([
        ["US Dollars", "usd"],
        ["Canada Dollars", "cad"],
        ["Euros", "eur"],
        ["British pounds", "gbp"],
        ["Share of GDP", "gdp"]
    ]),
    {
        label: "Unit",
        value: "gdp"
    }
);
const unitMulti = Generators.input(unitMultiInput)

// Flow input
const flowMultiInput = Inputs.select(
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
const flowMulti = Generators.input(flowMultiInput)

// Category Input
const categoryMultiInput = Inputs.select(
    ["All", ...categories], {
        label: "Category",
        value: "All"
    }
);
const categoryMulti = Generators.input(categoryMultiInput)

// Prices Input
const pricesMultiInput = Inputs.radio(
    new Map([
        ["Constant", "constant"],
        ["Current", "current"]
    ]),
    {
        label: "Prices",
        value: "constant"
    }
);
const pricesMulti = Generators.input(pricesMultiInput)

// Time Input
const timeRangeMultiInput = rangeInput(
    {
        min: timeRange[0],
        max: timeRange[1],
        step: 1,
        value: [timeRange[1] - 10, timeRange[1]],
        label: "Time range",
        enableTextInput: true
    })
const timeRangeMulti = Generators.input(timeRangeMultiInput)
```

```js
// DATA  QUERIES

function getCountryList(name) {
    if (Array.isArray(name)) {
        return name.flatMap(n => groupMappings[n] || [n]);
    }
    return groupMappings[name] || [name];
}

const escapeSQL = (str) => str.replace(/'/g, "''");

const unpivotColumns = categories.map(cat => `'${escapeSQL(cat)}'`).join(", ");

// SINGLE COUNTRY VIEW

const countrySingleList = getCountryList(countrySingle);
const partnerSingleList = getCountryList(partnerSingle);

const countrySingleSQLList = countrySingleList
    .map(c => `'${escapeSQL(c)}'`)
    .join(", ");
const partnerSingleSQLList = partnerSingleList
    .map(c => `'${escapeSQL(c)}'`)
    .join(", ");

const isGdpSingle = unitSingle === "gdp" ? true : false;
const unitColumnSingle = isGdpSingle
    ? "usd_constant"
    : `${unitSingle}_${pricesSingle}`;
const conversionTableSingle = isGdpSingle
    ? "constant_conversion_table"
    : `${pricesSingle}_conversion_table`

const querySingleString = `
    WITH filtered AS (
        SELECT * 
        FROM trade
        WHERE 
            ((exporter IN (${countrySingleSQLList}) AND importer IN (${partnerSingleSQLList})) OR 
            (importer IN (${countrySingleSQLList}) AND exporter IN (${partnerSingleSQLList}))) 
            AND year BETWEEN ? AND ?
    ),
    unpivoted AS (
        SELECT year, exporter, importer, category, value
        FROM filtered
        UNPIVOT (value FOR category IN (${categorySingle === "All" ? unpivotColumns : `'${categorySingle}'`}))
    ),
    exports AS (
        SELECT u.year, u.category, SUM(u.value * c.factor * 1.1 / 1.1) AS exports -- Multipliying and diving by the same number other than 1 converts from Uint1Array to float
        FROM unpivoted u
        JOIN conversion c 
            ON u.year = c.year
            ${pricesSingle === "constant" | isGdpSingle ? "AND u.exporter = c.country" : ""}  
        WHERE u.exporter IN (${countrySingleSQLList}) 
        AND u.importer IN (${partnerSingleSQLList})
        GROUP BY u.year, u.category
    ),
    imports AS (
        SELECT u.year, u.category, SUM(u.value * c.factor) AS imports
        FROM unpivoted u
        JOIN conversion c 
            ON u.year = c.year
            ${pricesSingle === "constant" | isGdpSingle ? "AND u.importer = c.country" : ""}  
        WHERE u.importer IN (${countrySingleSQLList}) 
        AND u.exporter IN (${partnerSingleSQLList})
        GROUP BY u.year, u.category
    ),
    conversion AS (
        SELECT year, ${pricesSingle === "constant" | isGdpSingle ? "country," : ""} ${unitColumnSingle} AS factor 
        FROM ${conversionTableSingle}
        ${pricesSingle === "constant" | isGdpSingle ? `WHERE country IN (${countrySingleSQLList})` : ""}
    ),
    gdp AS (
        SELECT year, SUM(gdp_constant) AS gdp
        FROM gdp_table
        WHERE country IN (${countrySingleSQLList})
        GROUP BY year
    )
    SELECT 
        COALESCE(e.year, i.year) AS year,
        COALESCE(e.category, i.category) AS category,
        '${escapeSQL(countrySingle)}' AS country,
        '${escapeSQL(partnerSingle)}' AS partner,
        COALESCE(e.exports, 0) AS exports,
        COALESCE(i.imports, 0) * -1 AS imports,
        COALESCE(e.exports, 0) - COALESCE(i.imports, 0) AS balance,
        g.gdp AS gdp,
        CASE 
            WHEN ${isGdpSingle} THEN 'share of gdp'
            ELSE '${pricesSingle} ${unitSingle} million'
        END AS unit
    FROM exports e
    FULL OUTER JOIN imports i
        ON e.year = i.year AND e.category = i.category
    LEFT JOIN gdp g
        ON COALESCE(e.year, i.year) = g.year;
`;

const querySingleParams = [timeRangeSingle[0], timeRangeSingle[1]];

const querySingle = await db.query(querySingleString, querySingleParams);

const dataSingle = querySingle.toArray()
    .map((row) => ({
        ...row
    }))

//  MULTI COUNTRY VIEW

const countryMultiList = getCountryList(countryMulti);
const partnersMultiList = getCountryList(partnersMulti);

const countryMultiSQLList = countryMultiList.map(escapeSQL).map(c => `'${c}'`).join(", ");
const partnersMultiSQLList = partnersMultiList.length > 0
    ? partnersMultiList.map(escapeSQL).map(c => `'${c}'`).join(", ")
    : "'NO_MATCH'"; // Fallback value that will never match

// Define unit column
const isGdpMulti = unitMulti === "gdp" ? true : false
const unitColumnMulti = isGdpMulti
    ? "usd_constant"
    : `${unitMulti}_${pricesMulti}`;
const conversionTableMulti = isGdpMulti
    ? "constant_conversion_table"
    : `${pricesMulti}_conversion_table`

// Define flow column selection
const flowColumn = flowMulti === 'exports'
    ? `COALESCE(SUM(e.exports), 0)`
    : flowMulti === 'imports'
        ? `COALESCE(SUM(i.imports), 0) * -1`
        : `COALESCE(SUM(e.exports), 0) - COALESCE(SUM(i.imports), 0)`

// Generate CASE statement for importer/exporter mappings
function caseStatement(name) {
    return partnersMulti.map(group =>
        `CASE WHEN ${name} IN (${groupMappings[group].map(escapeSQL).map(c => `'${c}'`).join(", ")}) THEN '${escapeSQL(group)}' END`
    ).join(", ");
}

const queryMultiString = `
    WITH filtered AS (
        SELECT * 
        FROM trade
        WHERE 
            ((exporter IN (${countryMultiSQLList}) AND importer IN (${partnersMultiSQLList})) OR 
            (importer IN (${countryMultiSQLList}) AND exporter IN (${partnersMultiSQLList}))) 
            AND year BETWEEN ? AND ?
    ),
    unpivoted AS (
        SELECT year, exporter, importer, category, value
        FROM filtered
        UNPIVOT (value FOR category IN (${categoryMulti === "All" ? unpivotColumns : `'${categoryMulti}'`}))
    ),
    exports AS (
        SELECT year, partner, category, SUM(exports) AS exports
        FROM (
            SELECT u.year, u.category, SUM(u.value * c.factor) AS exports, 
                   unnest(ARRAY[ ${caseStatement("u.importer")} ]) AS partner
            FROM unpivoted u
            JOIN conversion c 
                ON u.year = c.year
                ${pricesMulti === "constant" | isGdpMulti ? "AND u.exporter = c.country" : ""} 
            WHERE u.exporter IN (${countryMultiSQLList}) 
            AND u.importer IN (${partnersMultiSQLList})
            GROUP BY u.year, u.importer, u.category
        ) expanded
        WHERE partner IS NOT NULL
        GROUP BY year, partner, category
    ),
    imports AS (
        SELECT year, partner, category, SUM(imports) AS imports
        FROM (
            SELECT u.year, u.category, SUM(u.value * c.factor * 1.1 / 1.1) AS imports, -- Multipliying and diving by the same number other than 1 converts from Uint1Array to float
                   unnest(ARRAY[ ${caseStatement("u.exporter")} ]) AS partner
            FROM unpivoted u
            JOIN conversion c 
                ON u.year = c.year
                ${pricesMulti === "constant" | isGdpMulti ? "AND u.importer = c.country" : ""} 
            WHERE u.importer IN (${countryMultiSQLList}) 
            AND u.exporter IN (${partnersMultiSQLList})
            GROUP BY u.year, u.exporter, u.category
        ) expanded
        WHERE partner IS NOT NULL
        GROUP BY year, partner, category
    ),
    conversion AS (
        SELECT year, ${pricesMulti === "constant" | isGdpMulti ? "country," : ""} ${unitColumnMulti} AS factor 
        FROM ${conversionTableMulti}
        ${pricesMulti === "constant" | isGdpMulti ? `WHERE country IN (${countryMultiSQLList})` : ""}
    ),
    gdp AS (
        SELECT year, SUM(gdp_constant) AS gdp
        FROM gdp_table
        WHERE country IN (${countryMultiSQLList})
        GROUP BY year
    )
    SELECT 
        COALESCE(e.year, i.year) AS year,
        '${escapeSQL(countryMulti)}' AS country,
        COALESCE(e.partner, i.partner) AS partner,
        COALESCE(e.category, i.category) AS category,
        SUM(COALESCE(e.exports, 0)) AS exports,
        SUM(COALESCE(i.imports, 0)) * -1 AS imports,
        (SUM(COALESCE(e.exports, 0)) - SUM(COALESCE(i.imports, 0))) AS balance,
        g.gdp AS gdp,
        CASE 
            WHEN ${isGdpMulti} THEN 'share of gdp'
            ELSE '${pricesMulti} ${unitMulti} million'
        END AS unit          
    FROM exports e
    FULL OUTER JOIN imports i
    ON e.year = i.year 
        AND e.partner = i.partner 
        AND e.category = i.category 
    LEFT JOIN gdp g
        ON COALESCE(e.year, i.year) = g.year
        GROUP BY COALESCE(e.year, i.year), 
                 COALESCE(e.partner, i.partner), 
                 COALESCE(e.category, i.category),
                 g.gdp
`;

const queryMultiParams = [timeRangeMulti[0], timeRangeMulti[1]];

const queryMulti = await db.query(queryMultiString, queryMultiParams);

const dataMulti = queryMulti.toArray()
    .map((row) => ({
        ...row
    }))
```

```js
// Handle view selection
document.querySelectorAll('.view-button').forEach(button => {
    button.addEventListener('click', function () {
        // Remove 'active' class from all buttons
        document.querySelectorAll('.view-button').forEach(btn => btn.classList.remove('active'));

        // Remove 'active' class from all view divs
        document.querySelectorAll('#single-view, #multi-view, #about-view').forEach(view => view.classList.remove('active'));

        // Add 'active' class to the clicked button
        this.classList.add('active');

        // Determine which view div to activate
        const viewId = this.id.replace('-button', '-view');
        document.getElementById(viewId)?.classList.add('active');
    });
});
```

<div class="title-container" xmlns="http://www.w3.org/1999/html">
    <div class="title-logo">
        <a href="https://data.one.org/" target="_blank">
            <img src="./ONE-logo-black.png" alt="A black circle with ONE written in white thick letters.">
        </a>
    </div>
    <h1 class="title-text">
        Trade explorer
    </h1>
</div>


<div class="header card">
    <button id="single-button" class="view-button active">Single Country</button>
    <button id="multi-button" class="view-button">Multi Country</button>
    <button id="about-button" class="view-button">About</button>
</div>

<div id="single-view" class="view-box active">
    <div class="card settings">
        <div class="settings-group">
            ${countrySingleInput}
            ${partnerSingleInput}
        </div>
        <div class="settings-group">
            ${unitSingleInput}
            ${categorySingleInput}
        </div>
        <div class="settings-group">
            ${isGdpSingle ? html` ` : pricesSingleInput}
            ${timeRangeSingleInput}
        </div>
    </div>
    <div class="grid grid-cols-2">
        <div class="card">
            <div class="plot-container" id="single-plot">
                <h2 class="plot-title">
                    ${`Trade between ${countrySingle} and ${partnerSingle}`}
                </h2>
                <h3 class="plot-subtitle">
                    <span class="export-label subtitle-label">Exports</span>,
                    <span class="import-label subtitle-label">imports</span> and
                    <span class="balance-label subtitle-label">trade balance</span>
                </h3>
                ${
                    resize(
                        (width) => plotSingle(dataSingle, width)
                    )
                }
                <div class="bottom-panel">
                    <div class="text-section">
                        <p class="plot-note">Source: <a
                                href="https://cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37" target="_blank"
                                rel="noopener noreferrer">BACI: International trade database at the Product-level</a>.
                            CEPII. •
                            ${
                                isGdpSingle
                                    ? html`<span>All values as a share of ${formatString(countrySingle, {genitive: true})} GDP.</span>`
                                    : pricesSingle === "constant"
                                        ? html`<span>All values in constant 2023 ${getUnitLabel(unitSingle, {})}.</span>`
                                        : html`<span>All values in current ${getUnitLabel(unitSingle, {})}.</span>`
                            }
                            <span>Exports refer to the value of goods traded from ${countrySingle} to ${partnerSingle}.</span>
                        </p>
                    </div>
                    <div class="logo-section">
                        <a href="https://data.one.org/" target="_blank">
                            <img src="./ONE-logo-black.png" alt="A black circle with ONE written in white thick letters.">
                        </a>
                    </div>
                </div>
            </div>
            <div class="download-panel">
                ${
                    Inputs.button(
                        "Download plot", {
                            reduce: () => downloadPNG(
                                'single-plot',
                                formatString(
                                    `Trade between ${countrySingle} and ${partnerSingle}`,
                                    { capitalize: false, fileMode: true }
                                )
                            )
                        }
                    )
                }
            </div>
        </div>
        <div class="card">
            <div class="plot-container" id="single-table">
                <h2 class="table-title">
                    ${`Trade between ${countrySingle} and ${partnerSingle}`}
                </h2>
                <h3 class="table-subtitle">
                    By product category, ${timeRangeSingle[0] === timeRangeSingle[1] ? timeRangeSingle[0] :
                    `${timeRangeSingle[0]}-${timeRangeSingle[1]}`}
                </h3>
                ${resize((width) =>
                tableSingle(dataSingle, width)
                )}
                <div class="bottom-panel">
                    <div class="text-section">
                        <p class="plot-note">Source: <a
                                href="https://cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37" target="_blank"
                                rel="noopener noreferrer">BACI: International trade database at the Product-level</a>.
                            CEPII. •
                            ${
                                isGdpSingle
                                    ? html`<span>All values as a share of ${formatString(countrySingle, {genitive: true})} GDP.</span>`
                                    : pricesSingle === "constant"
                                        ? html`<span>All values in constant 2023 ${getUnitLabel(unitSingle, {})}.</span>`
                                        : html`<span>All values in current ${getUnitLabel(unitSingle, {})}.</span>`
                            }
                            <span>Exports refer to the value of goods traded from ${countrySingle} to ${partnerSingle}.</span>
                        </p>
                    </div>
                    <div class="logo-section">
                        <a href="https://data.one.org/" target="_blank">
                            <img src="./ONE-logo-black.png" alt="A black circle with ONE written in white thick letters.">
                        </a>
                    </div>
                </div>
            </div>
            <div class="download-panel">
                ${
                    Inputs.button(
                        "Download data", {
                            reduce: () => downloadXLSX(
                                dataSingle,
                                formatString(
                                    `trade between ${countrySingle} and ${partnerSingle}`,
                                    { capitalize: false, fileMode: true }
                                )
                            )
                        }
                    )
                }
            </div>
        </div>
    </div>
</div>


<div id="multi-view" class="view-box">
    <div class="card settings">
        <div class="settings-group">
            ${countryMultiInput}
            ${partnersMultiInput}
        </div>
        <div class="settings-group">
            ${unitMultiInput}
            ${categoryMultiInput}
        </div>
        <div class="settings-group">
            ${isGdpMulti ? html` ` : pricesMultiInput}
            ${timeRangeMultiInput}
            ${flowMultiInput}
        </div>
    </div>
    <div class="grid grid-cols-2">
        <div class="card">
            <div class="plot-container" id="multi-plot">
                <h2 class="plot-title">
                    ${formatString(flowMulti, {inSentence: true, capitalize: true})} ${countryMulti}
                </h2>
                ${generateSubtitle(partnersMulti)}
                ${
                    resize(
                        (width) => plotMulti(dataMulti, flowMulti, width)
                    )
                }
                <div class="bottom-panel">
                    <div class="text-section">
                        <p class="plot-note">Source: <a
                                href="https://cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37" target="_blank"
                                rel="noopener noreferrer">BACI: International trade database at the Product-level</a>.
                            CEPII.  •
                            ${
                                isGdpMulti
                                ? html`<span>All values as a share of ${formatString(countryMulti, {genitive: true})} GDP.</span>`
                                : pricesSingle === "constant"
                                    ? html`<span>All values in constant 2023 ${getUnitLabel(unitMulti, {})}.</span>`
                                    : html`<span>All values in current ${getUnitLabel(unitMulti, {})}.</span>`
                            }
                            ${
                                flowMulti === "exports"
                                ? html`<span>Exports refer to the value of goods traded from ${countryMulti} to the selected partners.</span>`
                                : flowMulti === "imports"
                                    ? html`<span>Imports refer to the value of goods traded from the selected partners to ${countryMulti}.</span>`
                                    : html`<span>A positive trade balance indicates ${formatString(countryMulti, {genitive: true})} exports to a partner exceed its imports from that partner.</span>`
                            }
                        </p>
                    </div>
                    <div class="logo-section">
                        <a href="https://data.one.org/" target="_blank">
                            <img src="./ONE-logo-black.png" alt="A black circle with ONE written in white thick letters.">
                        </a>
                    </div>
                </div>
            </div>
            <div class="download-panel">
                ${
                    Inputs.button(
                        "Download plot", {
                            reduce: () => downloadPNG(
                                'multi-plot',
                                formatString(flowMulti + " " + countryMulti, {inSentence: true, capitalize: false, fileMode: true})
                            )
                        }
                    )
                }
            </div>
        </div>
        <div class="card">
            <div class="plot-container" id="multi-table">
                <h2 class="table-title">
                    ${formatString(flowMulti, {inSentence: true, capitalize: true})} ${countryMulti}
                </h2>
                <h3 class="table-subtitle">
                    By product category, ${timeRangeMulti[0] === timeRangeMulti[1] ? timeRangeMulti[0] :
                    `${timeRangeMulti[0]}-${timeRangeMulti[1]}`}
                </h3>
                ${resize((width) =>
                tableMulti(dataMulti, flowMulti, width)
                )}
                <div class="bottom-panel">
                    <div class="text-section">
                        <p class="plot-note">Source: <a
                                href="https://cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37" target="_blank"
                                rel="noopener noreferrer">BACI: International trade database at the Product-level</a>.
                            CEPII. •
                            ${
                                isGdpMulti
                                ? html`<span>All values as a share of ${formatString(countryMulti, {genitive: true})} GDP.</span>`
                                : pricesSingle === "constant"
                                    ? html`<span>All values in constant 2023 ${getUnitLabel(unitMulti, {})}.</span>`
                                    : html`<span>All values in current ${getUnitLabel(unitMulti, {})}.</span>`
                            }
                            ${
                                flowMulti === "exports"
                                ? html`<span>Exports refer to the value of goods traded from ${countryMulti} to the selected partners.</span>`
                                : flowMulti === "imports"
                                    ? html`<span>Imports refer to the value of goods traded from the selected partners to ${countryMulti}.</span>`
                                    : html`<span>A positive trade balance indicates ${formatString(countryMulti, {genitive: true})} exports to a partner exceed its imports from that partner.</span>`
                            }
                        </p>
                    </div>
                    <div class="logo-section">
                        <a href="https://data.one.org/" target="_blank">
                            <img src="./ONE-logo-black.png" alt="A black circle with ONE written in white thick letters.">
                        </a>
                    </div>
                </div>
            </div>
            <div class="download-panel">
                ${
                    Inputs.button(
                        "Download data", {
                            reduce: () => downloadXLSX(
                                dataMulti,
                                formatString("trade with " + countryMulti, {inSentence: true, capitalize: false, fileMode: true})
                            )
                        }
                    )
                }
            </div>
        </div>
    </div>
</div>


<div id="about-view" class="view-box">
    <div class="card methodology">
        <h2 class="section-header">
            How to use
        </h2>
        <p class="normal-text">
            The tool provides two options to analyze international trade data; <span
                class="italic-span">Single Country</span> allows you to explore trade between a selected country and a
            single trading partner, whereas <span class="italic-span">Multi Country</span> lets you compare a country’s
            trade
            with multiple partners simultaneously.
        </p>
        <p class="normal-text">
            Begin by selecting a country or country group from the <span class="italic-span">Country</span> dropdown
            menu. All
            trade figures are presented from the selected country’s perspective. For example, if you choose Botswana,
            exports represent goods and services flowing out of Botswana to the selected partner, while imports
            represent
            inflows into Botswana. In this sense, exports are shown as positive values, indicating revenue from outgoing
            goods and services, while imports are negative values, reflecting expenditures on incoming goods and
            services.
        </p>
        <p class="normal-text">
            In <span class="italic-span">Multi Country</span>, you can select up to 5 trading partners. To allow for
            cleaner
            comparisons across them, you can only visualize a single trade flow (exports, imports or trade balance) at
            a time.
        </p>
        <p class="normal-text">
            To ensure that the data shown is accurate, certain options will be disabled depending on the selected <span
                class="italic-span">Country</span> and
            <span class="italic-span">Partner(s)</span>. For instance, if France is selected as <span
                class="italic-span">Country</span>, you won't be able to
            select France, EU27 countries, G7 countries or G20 countries as <span class="italic-span">Partner</span>, as
            these
            options overlap with France.
        </p>
        <h2 class="section-header">
            Country groups
        </h2>
        <ul class="group-list">
            ${
                Object.entries(groupMappings)
                    .filter(([_, countries]) => countries.length > 1)
                    .sort(([a], [b]) => a.localeCompare(b)) // Sort alphabetically by group name
                    .map(([group, countries]) => html`<li><span class="group-name">${group}</span>: ${countries.join(", ")}.</li>`)
            }
        </ul>
        <h2 class="section-header">
            Methodology
        </h2>
        <p class="normal-text">
            Trade data is retrieved from CEPII's
            <a href="https://cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37">BACI database</a>
            and grouped by product category according to
            <a href="https://www.wcoomd.org/en/topics/nomenclature/instrument-and-tools/hs-nomenclature-2022-edition/hs-nomenclature-2022-edition.aspx">
                HS Nomenclature</a>,
            with each HS section forming a category.
        </p>
        <p class="normal-text">
            The original trade figures are presented in current US Dollars. They are converted into other currencies and
            constant prices via
            <a href="https://github.com/jm-rivera/pydeflate">pydeflate</a>.
        </p>
        <p class="normal-text">
            Figures expressed as a share of GDP are based on World Economic Outlook GDP data, retrieved via the
            <a href="https://github.com/ONEcampaign/bblocks_data_importers">bblocks_data_importers</a>.
            When data is grouped by year (e.g., in plots), the share of GDP refers to the GDP of the selected country or
            country
            group for that specific year. When grouped by product category (e.g., in tables), it refers to the combined
            GDP of the selected country or country group over the chosen time period.
        </p>
        <p class="normal-text">
            The data preparation scripts are located in the <span style="font-family: monospace">src/data</span>
            directory of the project's <a href="https://github.com/ONEcampaign/trade_data_explorer"> GitHub
            repository</a>.
        </p>
        <h2 class="section-header">
            Contact
        </h2>
        <p class="normal-text">
            For questions or suggestions, please contact miguel.haroruiz[at]one[dot]org.
        </p>
    </div>
</div>
