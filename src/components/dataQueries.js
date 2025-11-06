import {DuckDBClient} from "npm:@observablehq/duckdb";

const BUCKET = "data-apps-one-data";
const PREFIX = "sources/trade-explorer/reformat-front-end/";

let dbPromise = null;
async function getDB() {
  if (!dbPromise) {
    dbPromise = DuckDBClient.of().then(async (db) => {
      await db.query("LOAD parquet;");
      await db.query("LOAD httpfs;");
      await db.query("SET enable_http_metadata_cache = true;");
      await db.query("SET enable_object_cache = true;");
      await db.query("SET http_timeout = 120000;");
      return db;
    });
  }
  return dbPromise;
}

async function tryConfigure(db, sql) {
  try {
    await db.query(sql);
  } catch (error) {
    console.warn("DuckDB config skipped", {sql, message: error?.message});
  }
}

function escapeSQL(str) {
  return String(str).replace(/'/g, "''");
}

function toArray(value) {
  return Array.isArray(value) ? value : [value];
}

function unique(values) {
  return [...new Set(values)];
}

function getSelectionValues(value) {
  const values = value == null ? [] : toArray(value);
  return unique(values.filter((item) => item != null && item !== ""));
}

function buildSQLList(values) {
  if (!values.length) {
    return null;
  }
  return values.map((value) => `'${escapeSQL(value)}'`).join(", ");
}

function unitLabel(unit, prices) {
  return unit === "gdp" ? "share of gdp" : `${prices} ${unit} million`;
}

function valueExpression(unit, prices) {
  if (unit === "gdp") {
    return "NULL::DOUBLE";
  }
  const column = `value_${unit}_${prices}`;
  return `CAST(${column} AS DOUBLE) / 1e6`;
}

function buildCategoryClause(category) {
  return category && category !== "All"
    ? `AND category = '${escapeSQL(category)}'`
    : "";
}

const GROUP_PARTNER_NAMES = [
  "African countries",
  "BRICS countries",
  "EU27 countries",
  "Eastern African countries",
  "G20 countries",
  "G7 countries",
  "Horn of Africa countries",
  "MERCOSUR",
  "Middle African countries",
  "Northern African countries",
  "Sahel countries",
  "Southern African countries",
  "Sub-saharan countries",
  "Western African countries"
];

function excludeGroupPartners(column = "partner") {
  if (!GROUP_PARTNER_NAMES.length) {
    return "";
  }
  const list = GROUP_PARTNER_NAMES.map((name) => `'${escapeSQL(name)}'`).join(", ");
  return `AND ${column} NOT IN (${list})`;
}

const metadataCache = new Map();
const metadataPending = new Map();

function encodePartitionValue(value) {
  return encodeURIComponent(value)
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27");
}

function countryListURL(country, pageToken = null) {
  const encoded = encodePartitionValue(country);
  const url = new URL(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o`);
  url.searchParams.set("prefix", `${PREFIX}country=${encoded}/`);
  url.searchParams.set("fields", "items(name,size,updated),nextPageToken");
  url.searchParams.set("maxResults", "200");
  if (pageToken) {
    url.searchParams.set("pageToken", pageToken);
  }
  return url.toString();
}

function downloadURLForObject(objectName) {
  return `https://storage.googleapis.com/download/storage/v1/b/${BUCKET}/o/${encodeURIComponent(objectName)}?alt=media`;
}

async function loadCountryMetadata(country) {
  const objectNames = [];
  let pageToken = null;

  do {
    const response = await fetch(countryListURL(country, pageToken));
    if (!response.ok) {
      throw new Error(`Metadata ${response.status} ${response.statusText} for ${country}`);
    }
    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];
    for (const item of items) {
      if (item?.name?.endsWith(".parquet")) {
        objectNames.push(item.name);
      }
    }
    pageToken = data.nextPageToken ?? null;
  } while (pageToken);

  if (!objectNames.length) {
    throw new Error(`No parquet objects found for ${country}`);
  }

  objectNames.sort();
  metadataCache.set(country, objectNames);
}

async function ensureCountriesAvailable(countries) {
  const checks = countries.map((country) => {
    if (metadataCache.has(country)) {
      return null;
    }
    if (!metadataPending.has(country)) {
      const promise = loadCountryMetadata(country)
        .catch((error) => {
          metadataPending.delete(country);
          throw error;
        })
        .then((value) => {
          metadataPending.delete(country);
          return value;
        });
      metadataPending.set(country, promise);
    }
    return metadataPending.get(country);
  }).filter(Boolean);

  if (!checks.length) {
    return;
  }

  await Promise.all(checks);
}

function buildReadClauseForCountries(countries) {
  if (!countries.length) {
    throw new Error("No countries provided");
  }

  const selects = countries.map((country) => {
    const objects = metadataCache.get(country);
    if (!objects || !objects.length) {
      throw new Error(`Missing metadata for ${country}`);
    }
    const fileList = objects
      .map((objectName) => `'${downloadURLForObject(objectName).replace(/'/g, "''")}'`)
      .join(", ");
    return `SELECT '${escapeSQL(country)}' AS country, file.* FROM read_parquet([${fileList}], union_by_name=true) AS file`;
  });

  if (selects.length === 1) {
    return `(${selects[0]})`;
  }

  return `(${selects.join(" UNION ALL ")})`;
}

function isAllCategorySelection(category) {
  if (category == null) {
    return true;
  }
  const normalized = String(category).toLowerCase();
  return normalized === "all" || normalized === "all products";
}

function normalizeValue(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  if (Math.abs(value) < 1e-12) {
    return null;
  }
  return value;
}

function numericOrNull(value) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

const VALUE_COLUMNS = {
  usd: {constant: "value_usd_constant", current: "value_usd_current"},
  cad: {constant: "value_cad_constant", current: "value_cad_current"},
  eur: {constant: "value_eur_constant", current: "value_eur_current"},
  gbp: {constant: "value_gbp_constant", current: "value_gbp_current"}
};

function getValueForUnit(row, unit, prices) {
  if (unit === "gdp") {
    const raw = numericOrNull(row?.pct_of_gdp);
    if (raw == null) {
      return null;
    }
    return raw;
  }
  const columnGroup = VALUE_COLUMNS[unit];
  if (!columnGroup) {
    return null;
  }
  const columnName = columnGroup[prices];
  if (!columnName) {
    return null;
  }
  const raw = numericOrNull(row?.[columnName]);
  if (raw == null) {
    return null;
  }
  return raw / 1e6;
}

const countryDataCache = new Map();
const countryDataPending = new Map();

function buildPartnerFilter(selection) {
  const values = getSelectionValues(selection);
  const expanded = [];
  for (const value of values) {
    if (value === "All countries") {
      continue;
    }
    expanded.push(value);
  }
  return expanded.length ? new Set(expanded) : null;
}

async function fetchSingleRows(context) {
  const {countryList, countrySQL, timeStart, timeEnd, partnerFilterSet} = context;

  const rows = await getCountryData(countryList, countrySQL);
  const excludedPartners = new Set(countryList);

  return rows.filter((row) => {
    const year = Number(row?.year);
    if (!Number.isFinite(year) || year < timeStart || year > timeEnd) {
      return false;
    }
    if (excludedPartners.has(row?.partner)) {
      return false;
    }
    if (!partnerFilterSet && GROUP_PARTNER_NAMES.includes(row?.partner ?? "")) {
      return false;
    }
    return true;
  });
}

async function getCountryData(countryList, countrySQL) {
  const key = countryList.slice().sort().join("|");
  if (countryDataCache.has(key)) {
    return countryDataCache.get(key);
  }
  if (countryDataPending.has(key)) {
    return countryDataPending.get(key);
  }

  const promise = (async () => {
    await ensureCountriesAvailable(countryList);
    const parquetClause = buildReadClauseForCountries(countryList);

    const sql = `
      SELECT
        year,
        country,
        partner,
        category,
        flow,
        value_usd_constant,
        value_usd_current,
        value_cad_constant,
        value_cad_current,
        value_eur_constant,
        value_eur_current,
        value_gbp_constant,
        value_gbp_current,
        pct_of_gdp
      FROM ${parquetClause}
      WHERE country IN (${countrySQL})
    `;

    const rows = await runQuery(sql);
    const normalized = rows.map((row) => ({
      year: Number(row?.year),
      country: row?.country,
      partner: row?.partner,
      category: row?.category,
      flow: row?.flow,
      value_usd_constant: numericOrNull(row?.value_usd_constant),
      value_usd_current: numericOrNull(row?.value_usd_current),
      value_cad_constant: numericOrNull(row?.value_cad_constant),
      value_cad_current: numericOrNull(row?.value_cad_current),
      value_eur_constant: numericOrNull(row?.value_eur_constant),
      value_eur_current: numericOrNull(row?.value_eur_current),
      value_gbp_constant: numericOrNull(row?.value_gbp_constant),
      value_gbp_current: numericOrNull(row?.value_gbp_current),
      pct_of_gdp: numericOrNull(row?.pct_of_gdp)
    }));
    countryDataCache.set(key, normalized);
    countryDataPending.delete(key);
    return normalized;
  })().catch((error) => {
    countryDataPending.delete(key);
    throw error;
  });

  countryDataPending.set(key, promise);
  return promise;
}

function aggregatePartners(rows, context) {
  const {
    flow,
    category,
    unit,
    prices,
    unitLabel,
    timeStart,
    timeEnd,
    country,
    partnerFilterSet
  } = context;
  const isAllCategory = isAllCategorySelection(category);
  const multiplier = flow === "imports" ? -1 : 1;
  const yearsLabel = `${timeStart}-${timeEnd}`;

  const totals = new Map();
  const counts = unit === "gdp" ? new Map() : null;
  for (const row of rows) {
    if (row?.flow !== flow) {
      continue;
    }
    const partner = row?.partner;
    if (!partner) {
      continue;
    }
    if (!isAllCategory && row?.category !== category) {
      continue;
    }
    if (partnerFilterSet && !partnerFilterSet.has(partner)) {
      continue;
    }
    const contribution = getValueForUnit(row, unit, prices);
    if (contribution == null) {
      continue;
    }
    totals.set(partner, (totals.get(partner) ?? 0) + contribution);
    if (counts) {
      counts.set(partner, (counts.get(partner) ?? 0) + 1);
    }
  }

  const results = [];
  for (const [partner, total] of totals.entries()) {
    const averaged = counts ? (counts.get(partner) ? total / counts.get(partner) : null) : total;
    const rawValue = averaged == null ? null : averaged * multiplier;
    const value = rawValue == null ? null : normalizeValue(rawValue);
    if (value == null) {
      continue;
    }
    results.push({
      years: yearsLabel,
      country,
      partner,
      flow,
      value,
      unit: unitLabel
    });
  }

  results.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return results;
}

function aggregateCategories(rows, context) {
  const {
    flow,
    unit,
    prices,
    unitLabel,
    timeStart,
    timeEnd,
    country,
    partnerFilterSet
  } = context;
  const yearsLabel = `${timeStart}-${timeEnd}`;
  const multiplier = flow === "imports" ? -1 : 1;

  const totals = new Map();
  const counts = unit === "gdp" ? new Map() : null;
  for (const row of rows) {
    if (row?.flow !== flow) {
      continue;
    }
    if (!row?.category || row.category === "All products") {
      continue;
    }
    if (partnerFilterSet && !partnerFilterSet.has(row?.partner)) {
      continue;
    }
    const contribution = getValueForUnit(row, unit, prices);
    if (contribution == null) {
      continue;
    }
    totals.set(row.category, (totals.get(row.category) ?? 0) + contribution);
    if (counts) {
      counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
    }
  }

  const results = [];
  for (const [categoryName, total] of totals.entries()) {
    const averaged = counts ? (counts.get(categoryName) ? total / counts.get(categoryName) : null) : total;
    const rawValue = averaged == null ? null : averaged * multiplier;
    const value = rawValue == null ? null : normalizeValue(rawValue);
    if (value == null) {
      continue;
    }
    results.push({
      years: yearsLabel,
      country,
      partner: "RoW",
      category: categoryName,
      flow,
      value,
      unit: unitLabel
    });
  }

  results.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return results;
}

function aggregateWorldTrade(rows, context) {
  const {
    country,
    category,
    unit,
    prices,
    unitLabel,
    timeStart,
    timeEnd
  } = context;
  const isAllCategory = isAllCategorySelection(category);

  const yearlyTotals = new Map();

  for (const row of rows) {
    if (!isAllCategory && row?.category !== category) {
      continue;
    }
    const year = Number(row?.year);
    if (!Number.isFinite(year)) {
      continue;
    }
    let entry = yearlyTotals.get(year);
    if (!entry) {
      entry = {exports: 0, imports: 0};
      yearlyTotals.set(year, entry);
    }
    if (row?.flow === "exports") {
      entry.exports += getValueForUnit(row, unit, prices) ?? 0;
    } else if (row?.flow === "imports") {
      entry.imports += getValueForUnit(row, unit, prices) ?? 0;
    }
  }

  const results = [];
  for (let year = timeStart; year <= timeEnd; year += 1) {
    const totals = yearlyTotals.get(year) ?? {exports: 0, imports: 0};
    const exportsRaw = totals.exports;
    const importsRaw = totals.imports;
    const exportsValue = normalizeValue(exportsRaw);
    const importsValue = normalizeValue(importsRaw * -1);
    const balanceRaw = exportsRaw - importsRaw;
    const balanceValue = normalizeValue(balanceRaw);

    results.push({
      year,
      country,
      partner: "RoW",
      category,
      imports: importsValue,
      exports: exportsValue,
      balance: balanceValue,
      unit: unitLabel
    });
  }

  return results;
}

async function runQuery(sql) {
  const db = await getDB();
  try {
    const query = await db.query(sql);
    return query.toArray().map((row) => ({...row}));
  } catch (error) {
    console.error("DuckDB query failed", {sql, error});
    throw error;
  }
}

async function buildSingleContext(country, unit, prices, timeRange, category, flow, group) {
  const countryList = getSelectionValues(country);
  const filteredCountryList = countryList.filter((value) => value !== "All countries");
  const countrySQL = buildSQLList(filteredCountryList);

  if (!countrySQL) {
    return null;
  }

  const timeStartRaw = Array.isArray(timeRange) ? timeRange[0] : undefined;
  const timeEndRaw = Array.isArray(timeRange) ? timeRange[1] : undefined;

  let parsedStart = Number(timeStartRaw ?? timeRange ?? 0);
  let parsedEnd = Number(timeEndRaw ?? timeRange ?? parsedStart);

  if (!Number.isFinite(parsedStart)) {
    parsedStart = parsedEnd;
  }
  if (!Number.isFinite(parsedEnd)) {
    parsedEnd = parsedStart;
  }
  if (!Number.isFinite(parsedStart)) {
    parsedStart = 0;
  }
  if (!Number.isFinite(parsedEnd)) {
    parsedEnd = parsedStart;
  }
  if (parsedEnd < parsedStart) {
    const temp = parsedStart;
    parsedStart = parsedEnd;
    parsedEnd = temp;
  }

  return {
    country,
    countryList: filteredCountryList,
    countrySQL,
    unit,
    prices,
    category,
    flow,
    timeStart: Math.trunc(parsedStart),
    timeEnd: Math.trunc(parsedEnd),
    partnerFilterSet: buildPartnerFilter(group),
    unitLabel: unitLabel(unit, prices)
  };
}

export function singleQueries(country, unit, prices, timeRange, category, flow, group) {
  const contextPromise = buildSingleContext(country, unit, prices, timeRange, category, flow, group);

  const rowsPromise = contextPromise.then((context) => {
    if (!context) {
      return [];
    }
    return fetchSingleRows(context);
  });

  const buildResult = (aggregator) => Promise.all([contextPromise, rowsPromise]).then(([context, rows]) => {
    if (!context) {
      return [];
    }
    return aggregator(rows, context);
  });

  return {
    partners: buildResult(aggregatePartners),
    categories: buildResult(aggregateCategories),
    worldTrade: buildResult(aggregateWorldTrade)
  };
}

export function multiQueries(country, partners, unit, prices, timeRange, category, flow) {
  const contextPromise = buildMultiContext(country, partners, unit, prices, timeRange, category, flow);

  const rowsPromise = contextPromise.then((context) => {
    if (!context) {
      return [];
    }
    return fetchMultiRows(context);
  });

  const buildResult = (aggregator) => Promise.all([contextPromise, rowsPromise]).then(([context, rows]) => {
    if (!context) {
      return [];
    }
    return aggregator(rows, context);
  });

  return {
    plot: buildResult(buildMultiPlotData),
    table: buildResult(buildMultiTableData)
  };
}

async function buildMultiContext(country, partners, unit, prices, timeRange, category, flow) {
  const countryList = getSelectionValues(country);
  const partnersList = getSelectionValues(partners);

  const countrySQL = buildSQLList(countryList);
  const partnersSQL = buildSQLList(partnersList);

  if (!countrySQL || !partnersSQL) {
    return null;
  }

  const timeStartRaw = Array.isArray(timeRange) ? timeRange[0] : undefined;
  const timeEndRaw = Array.isArray(timeRange) ? timeRange[1] : undefined;

  let parsedStart = Number(timeStartRaw ?? timeRange ?? 0);
  let parsedEnd = Number(timeEndRaw ?? timeRange ?? parsedStart);

  if (!Number.isFinite(parsedStart)) {
    parsedStart = parsedEnd;
  }
  if (!Number.isFinite(parsedEnd)) {
    parsedEnd = parsedStart;
  }
  if (!Number.isFinite(parsedStart)) {
    parsedStart = 0;
  }
  if (!Number.isFinite(parsedEnd)) {
    parsedEnd = parsedStart;
  }
  if (parsedEnd < parsedStart) {
    const temp = parsedStart;
    parsedStart = parsedEnd;
    parsedEnd = temp;
  }

  const countryValue = countryList[0] ?? (Array.isArray(country) ? country[0] : country);

  return {
    country,
    countryValue,
    countryList,
    partners,
    partnersList,
    partnersSet: new Set(partnersList),
    unit,
    prices,
    category,
    flow,
    countrySQL,
    partnersSQL,
    timeStart: Math.trunc(parsedStart),
    timeEnd: Math.trunc(parsedEnd),
    unitLabel: unitLabel(unit, prices)
  };
}

async function fetchMultiRows(context) {
  const {countryList, countrySQL, timeStart, timeEnd, partnersSet} = context;
  if (!countryList.length) {
    return [];
  }

  const rows = await getCountryData(countryList, countrySQL);
  return rows.filter((row) => {
    const year = Number(row?.year);
    if (!Number.isFinite(year) || year < timeStart || year > timeEnd) {
      return false;
    }
    if (!partnersSet.has(row?.partner)) {
      return false;
    }
    return true;
  });
}

function buildMultiPlotData(rows, context) {
  const {
    countryValue,
    partnersList,
    partnersSet,
    unit,
    prices,
    category,
    unitLabel,
    timeStart,
    timeEnd
  } = context;

  const series = new Map();

  for (const row of rows) {
    const partner = row?.partner;
    if (!partnersSet.has(partner)) {
      continue;
    }
    if (category !== "All" && row?.category !== category) {
      continue;
    }
    const year = Number(row?.year);
    if (!Number.isFinite(year)) {
      continue;
    }
    const key = `${partner}|${year}`;
    let entry = series.get(key);
    if (!entry) {
      entry = {exports: 0, imports: 0};
      series.set(key, entry);
    }
    const contribution = getValueForUnit(row, unit, prices);
    if (contribution == null) {
      continue;
    }
    if (row?.flow === "exports") {
      entry.exports += contribution;
    } else if (row?.flow === "imports") {
      entry.imports += contribution;
    }
  }

  const results = [];
  for (const partner of partnersList) {
    for (let year = timeStart; year <= timeEnd; year += 1) {
      const entry = series.get(`${partner}|${year}`) ?? {exports: 0, imports: 0};
      const exportsRaw = entry.exports;
      const importsRaw = entry.imports;
      results.push({
        year,
        country: countryValue,
        partner,
        category,
        imports: normalizeValue(importsRaw * -1),
        exports: normalizeValue(exportsRaw),
        balance: normalizeValue(exportsRaw - importsRaw),
        unit: unitLabel
      });
    }
  }

  results.sort((a, b) => {
    const partnerCompare = String(a.partner).localeCompare(String(b.partner));
    if (partnerCompare !== 0) {
      return partnerCompare;
    }
    return (a.year ?? 0) - (b.year ?? 0);
  });

  return results;
}

function buildMultiTableData(rows, context) {
  const {
    countryValue,
    partnersSet,
    unit,
    prices,
    category,
    unitLabel,
    timeStart,
    timeEnd
  } = context;

  const aggregates = new Map();

  for (const row of rows) {
    const partner = row?.partner;
    if (!partnersSet.has(partner)) {
      continue;
    }
    const year = Number(row?.year);
    if (!Number.isFinite(year) || year < timeStart || year > timeEnd) {
      continue;
    }

    const categoryName = category === "All" ? (row?.category ?? category) : category;
    if (categoryName == null || categoryName === "") {
      continue;
    }

    const key = `${partner}|${categoryName}`;
    let entry = aggregates.get(key);
    if (!entry) {
      entry = {
        partner,
        category: categoryName,
        exportsValue: 0,
        importsValue: 0,
        exportsPct: 0,
        importsPct: 0,
        exportsCount: 0,
        importsCount: 0
      };
      aggregates.set(key, entry);
    }

    const contribution = getValueForUnit(row, unit, prices);
    if (contribution == null) {
      continue;
    }

    if (unit === "gdp") {
      if (row?.flow === "exports") {
        entry.exportsPct += contribution;
        entry.exportsCount += 1;
      } else if (row?.flow === "imports") {
        entry.importsPct += contribution;
        entry.importsCount += 1;
      }
    } else {
      if (row?.flow === "exports") {
        entry.exportsValue += contribution;
      } else if (row?.flow === "imports") {
        entry.importsValue += contribution;
      }
    }
  }

  const results = [];
  for (const entry of aggregates.values()) {
    let exportsRaw;
    let importsRaw;
    if (unit === "gdp") {
      exportsRaw = entry.exportsCount ? entry.exportsPct / entry.exportsCount : 0;
      importsRaw = entry.importsCount ? entry.importsPct / entry.importsCount : 0;
    } else {
      exportsRaw = entry.exportsValue;
      importsRaw = entry.importsValue;
    }

    results.push({
      years: `${timeStart}-${timeEnd}`,
      country: countryValue,
      partner: entry.partner,
      category: entry.category,
      imports: normalizeValue(importsRaw * -1),
      exports: normalizeValue(exportsRaw),
      balance: normalizeValue(exportsRaw - importsRaw),
      unit: unitLabel
    });
  }

  results.sort((a, b) => {
    const partnerCompare = String(a.partner).localeCompare(String(b.partner));
    if (partnerCompare !== 0) {
      return partnerCompare;
    }
    return String(a.category ?? "").localeCompare(String(b.category ?? ""));
  });

  return results;
}
