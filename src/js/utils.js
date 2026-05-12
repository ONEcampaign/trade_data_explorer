export function plotHeight(width) {
  if (width < 480) return Math.round(width * 0.6)
  if (width < 768) return Math.round(width * 0.45)
  return Math.round(width * 0.35)
}

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


