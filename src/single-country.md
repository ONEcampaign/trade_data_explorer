```js 
import { FileAttachment } from "observablehq:stdlib";
import { min, max } from "npm:d3-array";
import { sortCategories } from "./components/sortCategories.js";
import { rangeInput } from "./components/rangeInput.js";
import { plotSingle } from "./components/plotSingle.js";
import { tableSingle } from "./components/tableSingle.js";
import { colorPalette } from "./components/colorPalette.js";
import { setCustomColors } from "./components/setCustomColors.js"
```

```js 
setCustomColors();
```

```js 
const tradeData = FileAttachment("./data/africa_trade_2002_2022.csv").csv({typed:true});
```

```js 
// Input options
const countries = Array.from(new Set(tradeData.map((d) => d.country))).filter((item) => item !== null && item !== "");
const partners = Array.from(new Set(tradeData.map((d) => d.partner))).filter((item) => item !== null && item !== "");
const categories = sortCategories(Array.from(new Set(tradeData.map((d) => d.category))).filter((item) => item !== null && item !== ""));
const timeRange = [min(tradeData, d => d.year), max(tradeData, d => d.year)];
```

```js
const firstLink = document.querySelector("li.observablehq-secondary-link a");

function updateFirstLinkText() {
  const countryString = countryInput.value === "Dem. Rep. of the Congo" 
        ? "DRC-"
        : countryInput.value + "-"
  const partnerString = partnerInput.value === "United Kingdom"
  ? "UK"
  : partnerInput.value;
  
  if (firstLink) {
    firstLink.textContent = countryString + partnerString + " trade"
  }
}

// Add event listeners to update text reactively
countryInput.addEventListener("input", updateFirstLinkText);
partnerInput.addEventListener("input", updateFirstLinkText);

// Initial call to set the text content on page load
updateFirstLinkText();
```

```js
// Country Input
const countryInput = Inputs.select(
  countries,
  { label: "Select country", sort: true }
)
const countrySingle = Generators.input(countryInput);

// Partner Input
const partnerInput = Inputs.select(
  partners,
  { label: "Select partner", sort: true }
)
const partnerSingle = Generators.input(partnerInput)

// Time Input
const timeRangeInput = rangeInput({
  min: timeRange[0],
  max: timeRange[1],
  step: 1,
  value: [2012, 2022],
  label: "Adjust time range",
  color: colorPalette.inputTheme,
  enableTextInput: true
})
const timeRangeSingle = Generators.input(timeRangeInput)

// Select all input
const SelectAllInput = Inputs.toggle({
  label: "Select all",
  value: true
});

// Categories Input
const categoriesInput = Inputs.checkbox(categories, {
  label: "Select product categories",
  value: SelectAllInput.value ? categories : []
});
const categoriesSingle = Generators.input(categoriesInput);

// Reactive behavior to update categoriesInput and trigger categoriesSingle when SelectAllInput changes
SelectAllInput.addEventListener("input", () => {
  categoriesInput.value = SelectAllInput.value ? categories : [];
  
  // Manually dispatch an input event to trigger categoriesSingle update
  categoriesInput.dispatchEvent(new Event("input"));
});

// Unit input
const unitInput = Inputs.radio(
  new Map([
    ["Constant USD", "constant_usd_2015"],
    ["Current USD", "current_usd"],
    ["Percentage of GDP", "pct_gdp"]
  ]),
  {
    label: "Select unit",
    value: "constant_usd_2015"
  }
)
const unitSingle = Generators.input(unitInput)
```

<h1 class="header">
    Single Country
</h1>

<p class="normal-text">
    Begin by selecting an African country and a trading partner (ONE market) from the dropdown menus below. You can also adjust the time range, the product categories of traded goods and the unit of currency for the data shown.
</p>

<p class="normal-text">
    <a href="#trade-plot">This plot</a> shows exports and imports between the two selected countries as well as the trade balance, calculated as the difference between exports and imports. You can hover over the bars for additional information.
</p>

<p class="normal-text">
    <a href="#trade-by-year">This table</a> shows the figures included in the plot, whereas <a href="#trade-by-category">this one</a> presents trade data aggregated by product categories.
</p>

<br>

<div class="card" style="display: grid; gap: 0.5rem;">
  <div>${countryInput}</div>
  <div>${partnerInput}</div>
  <div>${timeRangeInput}</div>
  <div>${categoriesInput}</div>
  <div>${SelectAllInput}</div>
  <div>${unitInput}</div>
</div>

<br>
<br>



<div class="viz-container">
    <div class="top-panel">
        <h2 class="plot-title" id="trade-plot">
            Trade between ${countrySingle === "Dem. Rep. of the Congo" ? "DRC" : countrySingle} and ${partnerSingle}
        </h2>
        <h3 class="plot-subtitle">
            <span class="export-subtitle-label">Exports</span>, 
            <span class="import-subtitle-label">imports</span> and 
            <span class="balance-subtitle-label">trade balance</span> 
            ${unitSingle === "pct_gdp" ? "as percentage of GDP" : "in million USD"}
        </h3>
    </div>
    <div>
        ${plotSingle(tradeData, countrySingle, partnerSingle, timeRangeSingle, categoriesSingle, unitSingle)}
    </div>
    <div class="bottom-panel">
      <div class="text-section">
        <p class="plot-source">Source: Gaulier and Zignago (2010) <a href="https://cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37" target="_blank" rel="noopener noreferrer">BACI: International Trade Database at the Product-Level</a>. CEPII</p>
      </div>
      <div class="logo-section">
        <img src="./ONE-logo-black.png"/>
      </div>
    </div>
</div>

<br>
<br>

<div class="viz-container">
    <div class="top-panel">
        <h2 class="section-header" id="trade-by-category">
            Trade by category
        </h2>
        <p class="normal-text">
            Total value of exports and imports for each category of traded goods between 
            <span class="bold-text">${countrySingle === "Dem. Rep. of the Congo" ? "DRC" : countrySingle}</span> and 
            <span class="bold-text">${partnerSingle}</span> in 
            <span class="bold-text">${timeRangeSingle[0]}-${timeRangeSingle[1]}</span>.
        </p>
    </div>
    <div>
        ${tableSingle(tradeData, "category", countrySingle, partnerSingle, categoriesSingle, unitSingle, timeRangeSingle)}
    </div>
    <div class="bottom-panel">
        <div class="text-section">
            <p class="plot-source">Source: Gaulier and Zignago (2010) <a href="https://cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37" target="_blank" rel="noopener noreferrer">BACI: International Trade Database at the Product-Level</a>. CEPII</p>
            <p class="plot-note">All values ${unitSingle === "pct_gdp" ? "as percentage of GDP" : unitSingle === "constant_usd_2015" ? "in million constant 2015 USD" : "in million current USD"}.</p>
        </div>
        <div class="logo-section">
            <img src="./ONE-logo-black.png"/>
        </div>
    </div>
</div>

<br>
<br>

<div class="viz-container">
        <div class="top-panel">
        <h2 class="section-header" id="trade-by-year">
            Trade by year
        </h2>
        ${
            categoriesSingle.length === categories.length
            ? html`<p class="normal-text">Total yearly value of exports, imports and the resulting trade balance between <span class="bold-text">${countrySingle === "Dem. Rep. of the Congo" ? "DRC" : countrySingle}</span> and <span class="bold-text">${partnerSingle}</span> including <span class="bold-text">all product categories</span>.</p>`
            : html`<p class="normal-text">Total yearly value of exports, imports and the resulting trade balance between <span class="bold-text">${countrySingle === "Dem. Rep. of the Congo" ? "DRC" : countrySingle}</span> and <span class="bold-text">${partnerSingle}</span> including the following product categories:</p> <ul>${categoriesSingle.map((item) => html`<li>${item}</li>`)}</ul><br>`
        }
    </div>
    <div>
        ${tableSingle(tradeData, "year", countrySingle, partnerSingle, categoriesSingle, unitSingle)}
    </div>
    <div class="bottom-panel">
        <div class="text-section">
            <p class="plot-source">Source: Gaulier and Zignago (2010) <a href="https://cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37" target="_blank" rel="noopener noreferrer">BACI: International Trade Database at the Product-Level</a>. CEPII</p>
            <p class="plot-note">All values ${unitSingle === "pct_gdp" ? "as percentage of GDP" : unitSingle === "constant_usd_2015" ? "in million constant 2015 USD" : "in million current USD"}.</p>
        </div>
        <div class="logo-section">
            <img src="./ONE-logo-black.png"/>
        </div>
    </div>
</div>