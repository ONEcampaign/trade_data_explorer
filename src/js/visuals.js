import * as Plot from "npm:@observablehq/plot";
import * as Inputs from "npm:@observablehq/inputs";
import { html } from "npm:htl";
import { utcYear } from "npm:d3-time";
import { timeFormat } from "npm:d3-time-format";
import { customPalette, singlePalette, multiPalette } from "./colors.js";
import {
  formatValue,
  formatString,
  getUnitLabel,
  getLimits,
} from "./utils.js";


// Function to get color by domain
function getSingleColor(key) {
    const index = singlePalette.domain.indexOf(key);
    return index !== -1 ? singlePalette.range[index] : null; // Return color if found, otherwise null
};

export function baseTable(data, flow, mainColumn, width, {partners = [], multiMode = false} = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    return html`<div></div>`;
  }

  if (!multiMode) {
    return renderSingleFlowTable(data, flow, mainColumn, width);
  }

  const filtered = data.filter((row) => row?.category && row.category !== "All products");
  if (filtered.length === 0) {
    return html`<div></div>`;
  }

  const normalizedPartners = partners.length
    ? partners
    : Array.from(new Set(filtered.map((row) => row.partner).filter(Boolean)));

  if (normalizedPartners.length <= 1) {
    const targetPartner = normalizedPartners[0] ?? filtered[0]?.partner;
    const partnerRows = filtered.filter((row) => row.partner === targetPartner);
    return renderSinglePartnerCategoryTable(partnerRows, width);
  }

  return renderMultiPartnerCategoryTable(filtered, normalizedPartners, flow, width);
}

function renderSingleFlowTable(data, flow, mainColumn, width) {
  const tableData = data
    .filter((row) => row?.flow === flow && row?.value != null && row?.[mainColumn])
    .map((row) => ({
      [mainColumn]: row[mainColumn],
      [flow]: row.value
    }));

  if (!tableData.length) {
    return html`<div></div>`;
  }

  const limits = getLimits(tableData);
  const [minLimit, maxLimit] = normalizeLimits(limits);
  const numericColumns = Object.keys(tableData[0]).filter((key) => key !== mainColumn);
  const align = {
    [mainColumn]: "left",
    [flow]: flow === "imports" ? "right" : flow === "exports" ? "left" : "center"
  };

  return Inputs.table(tableData, {
    sort: numericColumns[0] ?? mainColumn,
    reverse: flow === "exports",
    format: {
      [mainColumn]: (value) => value,
      ...Object.fromEntries(
        numericColumns.map((key) => [
          key,
          sparkbar(
            getSingleColor(key) ?? customPalette.darkGrey,
            align[key] ?? "center",
            minLimit,
            maxLimit
          )
        ])
      )
    },
    header: Object.fromEntries(
      Object.keys(tableData[0]).map((key) => [key, formatString(key, {})])
    ),
    align,
    width
  });
}

function renderSinglePartnerCategoryTable(rows, width) {
  const tableData = rows
    .filter((row) => row?.category)
    .map((row) => ({
      category: row.category,
      imports: row.imports ?? null,
      exports: row.exports ?? null,
      balance: row.balance ?? null
    }));

  if (!tableData.length) {
    return html`<div></div>`;
  }

  const limits = getLimits(tableData);
  const [minLimit, maxLimit] = normalizeLimits(limits);
  const numericColumns = ["imports", "exports", "balance"];
  const align = {
    category: "left",
    imports: "right",
    exports: "left",
    balance: "center"
  };

  return Inputs.table(tableData, {
    sort: "exports",
    reverse: true,
    format: {
      category: (value) => value,
      ...Object.fromEntries(
        numericColumns.map((key) => [
          key,
          sparkbar(
            getSingleColor(key) ?? customPalette.darkGrey,
            align[key] ?? "center",
            minLimit,
            maxLimit
          )
        ])
      )
    },
    header: Object.fromEntries(
      Object.keys(tableData[0]).map((key) => [key, formatString(key, {})])
    ),
    align,
    width
  });
}

function renderMultiPartnerCategoryTable(rows, partners, flow, width) {
  const categories = Array.from(
    new Set(rows.map((row) => row.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const tableData = categories
    .map((category) => {
      const entry = {category};
      let hasValue = false;
      for (const partner of partners) {
        const match = rows.find((row) => row.partner === partner && row.category === category);
        const value = match ? getValueForFlow(match, flow) : null;
        entry[partner] = value;
        if (value != null) {
          hasValue = true;
        }
      }
      return hasValue ? entry : null;
    })
    .filter(Boolean);

  if (!tableData.length) {
    return html`<div></div>`;
  }

  const limits = getLimits(tableData.map((row) => {
    const values = {...row};
    delete values.category;
    return values;
  }));
  const [minLimit, maxLimit] = normalizeLimits(limits);
  const align = Object.fromEntries([
    ["category", "left"],
    ...partners.map((partner) => [partner, "center"])
  ]);

  return Inputs.table(tableData, {
    sort: partners[0],
    reverse: flow === "exports",
    format: {
      category: (value) => value,
      ...Object.fromEntries(
        partners.map((partner, index) => [
          partner,
          sparkbar(
            multiPalette[index % multiPalette.length],
            "center",
            minLimit,
            maxLimit
          )
        ])
      )
    },
    header: Object.fromEntries(
      ["category", ...partners].map((key) => [key, formatString(key, {})])
    ),
    align,
    width
  });
}

function getValueForFlow(row, flow) {
  if (flow === "imports") {
    return row.imports ?? null;
  }
  if (flow === "exports") {
    return row.exports ?? null;
  }
  return row.balance ?? null;
}

function normalizeLimits([minValue, maxValue]) {
  const min = Number.isFinite(minValue) ? minValue : 0;
  const max = Number.isFinite(maxValue) ? maxValue : 0;
  if (min === 0 && max === 0) {
    return [-1, 1];
  }
  return [min, max];
}


export function baseViz(data, partners, unit, flow, width, {wide= false}) {

    const isPhone = window.screen.width < 800

    const isMulti = partners.length > 1;

    const formattedData = data.map((row) => ({
        ...row,
        year: new Date(row.year, 1, 1), // Ensure year is just the integer
    }))

    const plotData = formattedData.flatMap(({ year, partner, imports, exports, balance }) => [
        { Year: year, Partner: partner, Flow: "imports", Value: imports },
        { Year: year, Partner: partner, Flow: "exports", Value: exports },
        { Year: year, Partner: partner, Flow: "balance", Value: balance },
    ]).filter((d) => d.Value !== null);

    const seriesBreaks = (() => {
        let foundNonNull = false, foundGap = false;
        return data.some(row => {
            if (row.balance !== null) {
                if (foundGap) return true; // If we already saw a gap, this confirms a break
                foundNonNull = true; // Mark start of non-null sequence
            } else if (foundNonNull) {
                foundGap = true; // Found a null after non-null values, potential break
            }
            return false;
        });
    })();

    const singleValue = data.filter(d => d.balance !== null).length === 1;

    if (isMulti) {
        return plotMultiPartner(plotData, unit, flow, width, {isPhone, seriesBreaks, singleValue});
    } else {
        return plotSinglePartner(plotData, unit, width, {isPhone, wide, seriesBreaks, singleValue});
    }
}


export function plotSinglePartner(
    data, unit, width,
    {
        isPhone= false,
        wide= false,
        seriesBreaks = false,
        singleValue = false
    }
    ) {

  const formatYear = timeFormat("%Y");

  return Plot.plot({
    width: width,
    height: wide && !isPhone ? width * 0.25
        : isPhone ? width * 0.7
            : width * 0.4,
    marginTop: 25,
    marginRight: wide && !isPhone ? 50 : 25,
    marginBottom: 25,
    marginLeft: wide && !isPhone ? 125 : 50,
    x: {
      inset: 10,
      label: null,
      tickSize: 0,
      ticks: 5,
      grid: false,
      tickFormat: "%Y",
      tickPadding: 10,
      interval: utcYear,
    },
    y: {
      inset: 5,
      label: getUnitLabel(unit, {}),
      tickSize: 0,
      ticks: 4,
      grid: true,
    },
    color: singlePalette,
    marks: [
      // Imports/exports bars
      Plot.rectY(data, {
        filter: (d) => d.Flow !== "balance",
        x: "Year",
        y: "Value",
        fill: "Flow"
      }),

      // Horizontal line at 0
      Plot.ruleY([0], {
        stroke: "black",
        strokeWidth: 0.5,
      }),

      Plot.line(data, {
          filter: (d) => d.Flow === "balance",
          x: "Year",
          y: "Value",
          stroke: "Flow",
          curve: "monotone-x",
          strokeWidth: 2,
      }),

      ...(
          (seriesBreaks | singleValue)
          ? [

              Plot.dot(data, {
                  filter: (d) => d.Flow === "balance",
                  x: "Year",
                  y: "Value",
                  fill: "Flow",
                  r: 3
              })
          ]
          : []
      ),

      Plot.tip(
        data,
        Plot.pointerX({
          x: "Year",
          y: "Value",
          fill: "Flow",
          format: {
            fill: (d) => formatString(d, {}),
            x: (d) => formatYear(d),
            y: (d) => `${formatValue(d).label}`,
            stroke: true,
          },
          lineHeight: 1.25,
          fontSize: 12,
        }),
      ),
    ],
  });
}


export function plotMultiPartner(
    data, unit, flow, width,
    {
        isPhone= false,
        seriesBreaks=false,
        singleValue=false
    }) {

  const formatYear = timeFormat("%Y");

  const colorPalette = {
      domain: [...new Set(data.map(row => row["Partner"]))].sort(),
      range: multiPalette
  };

  return Plot.plot({
    width: width,
    height: width * 0.5,
    marginTop: 25,
    marginRight: 25,
    marginBottom: 25,
    marginLeft: 50,
    x: {
      inset: 10,
      label: null,
      tickSize: 0,
      ticks: 5,
      grid: false,
      tickFormat: "%Y",
      tickPadding: 10,
      interval: utcYear,
    },
    y: {
      inset: 5,
      label: getUnitLabel(unit, {}),
      tickSize: 0,
      ticks: 4,
      grid: true,
    },
    color: colorPalette,
    marks: [

      // Horizontal line at 0
      Plot.ruleY([0], {
        stroke: "black",
        strokeWidth: 0.5,
      }),

      // Lines for each country
      Plot.line(data, {
        filter: (d) => d.Flow === flow,
        sort: ((a, b) => a.Year - b.Year),
        x: "Year",
        y: "Value",
        z: "Partner",
        curve: "monotone-x",
        stroke: "Partner",
        strokeWidth: 2,
      }),
      ...(
          (seriesBreaks | singleValue)
          ? [

              Plot.dot(data, {
                  filter: (d) => d.Flow === flow,
                  x: "Year",
                  y: "Value",
                  fill: "Partner",
                  r: 3
              })
          ]
          : []
      ),
      Plot.tip(
        data,
        Plot.pointer({
          filter: (d) => d.Flow === flow & d.Value !== 0,
          x: "Year",
          y: "Value",
          fill: "Partner",
          format: {
            fill: true,
            x: (d) => formatYear(d),
            y: (d) => `${formatValue(d).label}`,
            stroke: true,
          },
          lineHeight: 1.25,
          fontSize: 12,
        }),
      ),
    ],
  });
}


function sparkbar(fillColor, alignment, globalMin, globalMax) {
  const range = Math.abs(globalMax) + Math.abs(globalMin);
  const zeroPosition = Math.abs(globalMin) / range;

  return (x) => {
    const barWidth = Math.min(100, (100 * Math.abs(x)) / range);

    const barStyle =
      alignment === "center"
        ? `
          position: absolute;
          height: 80%;
          top: 10%;
          background: ${hex2rgb(fillColor, 0.4)};
          width: ${barWidth}%;
          ${
            x >= 0
              ? `left: ${zeroPosition * 100}%;`
              : `right: ${(1 - zeroPosition) * 100}%;`
          }
        `
        : `
          position: absolute;
          height: 80%;
          top: 10%;
          background: ${hex2rgb(fillColor, 0.4)};
          width: ${barWidth}%;
          ${alignment === "right" ? "right: 0;" : "left: 0;"};
        `;

    // Zero line style with full height
    const zeroLineStyle =
      alignment === "center"
        ? `
          position: absolute;
          height: 100%;
          width: 1px;
          background: ${hex2rgb(customPalette.midGrey, 0.5)};
          left: ${zeroPosition * 100}%;
        `
        : alignment === "right"
          ? `
          position: absolute;
          height: 100%;
          width: 1px;
          background: ${hex2rgb(customPalette.midGrey, 0.5)};
          right: 0;
        `
          : `
          position: absolute;
          height: 100%;
          width: 1px;
          background: ${hex2rgb(customPalette.midGrey, 0.5)};
          left: 0;
        `;

    // Text alignment based on alignment type
    const textAlignment =
      alignment === "center"
        ? "center"
        : alignment === "right"
          ? "end" // Right-align text
          : "start"; // Left-align text

    return html` <div
      style="
      position: relative;
      width: 100%;
      height: var(--size-l);
      background: none;
      display: flex;
      z-index: 0;
      align-items: center;
      justify-content: ${textAlignment};
      box-sizing: border-box;"
    >
      <div style="${barStyle}"></div>
      <div style="${zeroLineStyle}"></div>
      <!-- Zero line -->
      <span
        style="
          position: relative;
          z-index: 0;
          font-size: var(--size-s);
          font-size: var(--size-s);
          color: black;
          text-shadow: .5px .5px 0 ${customPalette.lightGrey};
          padding: 0 3px;"
      >
        ${formatValue(x).label}
      </span>
    </div>`;
  };
}


function hex2rgb(hex, alpha = 1) {
  // Remove the hash if present
  hex = hex.replace(/^#/, "");

  // Parse the hex into RGB js
  let r,
    g,
    b,
    a = 1; // Default alpha is 1

  if (hex.length === 6) {
    // If hex is #RRGGBB
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (hex.length === 8) {
    // If hex is #RRGGBBAA
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    a = parseInt(hex.slice(6, 8), 16) / 255; // Alpha is in [0, 255]
  } else {
    throw new Error("Invalid hex format. Use #RRGGBB or #RRGGBBAA.");
  }

  // Combine the RGBA js into a CSS string
  return `rgba(${r}, ${g}, ${b}, ${a * alpha})`;
}
