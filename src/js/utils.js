import { multiPalette } from "./colors.js";
import {logo} from "@one-data/observable-themes/use-images"


export function formatString(str, {
    capitalize=true,
    inSentence=false,
    fileMode=false,
    genitive=false,
    verb=null
  }) {

  let result = str.includes("balance")
    ? str.replace("balance", "trade balance")
    : str;

  if (inSentence) {
    result = result
      .replace(/\bbalance\b/, "balance with")
      .replace(/\bexports\b/, "exports to")
      .replace(/\bimports\b/, "imports from");
  }

  if (capitalize) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  } else {
    result = result.charAt(0).toLowerCase() + result.slice(1);
  }

  if (fileMode) {
    result = result.toLowerCase().replace(/\s+/g, "_");
  }

  if (genitive) {
    result += result.endsWith("s") ? "'" : "'s";
  }

  if (verb) {
    result += " " + (result.endsWith("countries")
        ? verb.replace(/s$/, "")  // Remove trailing "s"
        : verb);  // Otherwise, use the original verb
  }

  return result;
}


export function formatValue(value) {
  // Handle null values
  if (value == null) {
    return { value: 0, label: "0" };
  }

  // Round to two decimal places for the value
  const roundedValue = parseFloat(value.toFixed(2));

  // Determine the label
  let label;
  if (value === 0) {
    label = "0";
  } else if (value > -0.01 && value < 0.01) {
    if (value > -0.01) {
      label = "> -0.01";
    } else {
      label = "< 0.01";
    }
  } else {
    label = roundedValue.toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    });
  }

  // Return both rounded value and label
  return { value: roundedValue, label };
}


export function getLimits(data) {
  let minValue = Infinity;
  let maxValue = -Infinity;
  let hasNumericValue = false; // Track if any numeric value is found

  data.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (typeof row[key] === "number") {
        // Process only numeric values
        minValue = Math.min(minValue, row[key]);
        maxValue = Math.max(maxValue, row[key]);
        hasNumericValue = true;
      }
    });
  });

  return hasNumericValue ? [minValue, maxValue] : [null, null]; // Return null if no numeric values exist
}


export function getUnitLabel(unit, { long = true, value = "" }) {
  let prefix = "";
  let suffix = long ? "million" : "M";

  if (unit === "usd") {
    prefix = "US$";
  } else if (unit === "eur") {
    prefix = "€";
  } else if (unit === "cad") {
    prefix = "CA$";
  } else if (unit === "gbp") {
    prefix = "£";
  }

  if (value === "") {
    return `${prefix} ${suffix}`;
  }
  return `${prefix}${value} ${suffix}`;
}


export function reshapeDataForTable(data, flow, groupKey) {
  // Extract unique group keys (years or categories) and countries
  const groupKeys = [...new Set(data.map((d) => d[groupKey]))].sort();
  const countries = [...new Set(data.map((d) => d.partner))].sort();

  // Create an array of objects where each object represents a row for a specific group key
  const reshapedData = groupKeys.map((key) => {
    const row = { [groupKey]: key };
    countries.forEach((partner) => {
      const record = data.find(
        (d) => d[groupKey] === key && d.partner === partner,
      );
      row[partner] = record ? record[flow] : null; // Use null if no data is available
    });
    return row;
  });

  return reshapedData;
}



