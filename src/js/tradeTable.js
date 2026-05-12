import {html} from "npm:htl"
import {table} from "npm:@observablehq/inputs"
import {customPalette, singlePalette, multiPalette} from "./colors.js"
import {formatString, getLimits} from "./utils.js"
import {sparkbar} from "npm:@one-data/observable-themes/charts"


export function baseTable(data, flow, mainColumn, width = null, {partners = [], multiMode = false, allFlows = false, scale = null, unit = null} = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    return html`<div></div>`;
  }

  if (allFlows) {
    return renderAllFlowsTable(data, mainColumn, width, {scale});
  }

  if (!multiMode) {
    return renderSingleFlowTable(data, flow, mainColumn, width, {scale});
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
    return renderAllFlowsTable(partnerRows, "category", width, {scale});
  }

  return renderMultiPartnerCategoryTable(filtered, normalizedPartners, flow, width, {scale});
}


function renderSingleFlowTable(data, flow, mainColumn, width, {scale = null} = {}) {
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
  const formatter = scale ? (x) => formatTableValue(x, scale) : null;

  return table(tableData, {
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
            maxLimit,
            formatter
          )
        ])
      )
    },
    header: Object.fromEntries(
      Object.keys(tableData[0]).map((key) => [key, formatString(key, {})])
    ),
    align,
    ...(typeof width === "number" ? {width} : {})
  });
}


function renderAllFlowsTable(rows, mainColumn, width, {scale = null} = {}) {
  const tableData = rows
    .filter((row) => row?.[mainColumn])
    .map((row) => ({
      [mainColumn]: row[mainColumn],
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
    [mainColumn]: "left",
    imports: "right",
    exports: "left",
    balance: "center"
  };
  const formatter = scale ? (x) => formatTableValue(x, scale) : null;

  return table(tableData, {
    sort: "exports",
    reverse: true,
    format: {
      [mainColumn]: (value) => value,
      ...Object.fromEntries(
        numericColumns.map((key) => [
          key,
          sparkbar(
            getSingleColor(key) ?? customPalette.darkGrey,
            align[key] ?? "center",
            minLimit,
            maxLimit,
            formatter
          )
        ])
      )
    },
    header: Object.fromEntries(
      Object.keys(tableData[0]).map((key) => [key, formatString(key, {})])
    ),
    align,
    ...(typeof width === "number" ? {width} : {})
  });
}


function renderMultiPartnerCategoryTable(rows, partners, flow, width, {scale = null} = {}) {
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
        if (value != null) hasValue = true;
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
  const formatter = scale ? (x) => formatTableValue(x, scale) : null;

  return table(tableData, {
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
            maxLimit,
            formatter
          )
        ])
      )
    },
    header: Object.fromEntries(
      ["category", ...partners].map((key) => [key, formatString(key, {})])
    ),
    align,
    ...(typeof width === "number" ? {width} : {})
  });
}


function getValueForFlow(row, flow) {
  if (flow === "imports") return row.imports ?? null;
  if (flow === "exports") return row.exports ?? null;
  return row.balance ?? null;
}

function normalizeLimits([minValue, maxValue]) {
  const min = Number.isFinite(minValue) ? minValue : 0;
  const max = Number.isFinite(maxValue) ? maxValue : 0;
  if (min === 0 && max === 0) return [-1, 1];
  return [min, max];
}

function formatTableValue(x, scale) {
  if (x == null) return "—"
  const {divisor, suffix} = scale
  const scaled = x / divisor
  if (Math.abs(scaled) > 0 && Math.abs(scaled) < 0.01) return `< 0.01 ${suffix}`
  return `${scaled.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${suffix}`
}

function getSingleColor(key) {
  const index = singlePalette.domain.indexOf(key);
  return index !== -1 ? singlePalette.range[index] : null;
}


