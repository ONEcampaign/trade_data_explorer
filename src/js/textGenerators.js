import {formatString} from "./utils.js"
import {getCurrencyLabel} from "npm:@one-data/observable-themes/utils"

export function generateTitle({country=null, partners=null, flow=null, mode}) {
  if (mode === "chart") {
    if (Array.isArray(partners) && partners.length === 1) {
      return `${formatString(country, {genitive: true})} trade with ${partners[0]}`
    }
    return `${formatString(country, {genitive: true})} ${formatString(flow, {capitalize: false})}`
  }
  return ""
}

export function generateSubtitle({partners=null, flow=null, category=null, timeRange=null, mode}) {
  const categoryString = category === "All" ? "All products" : category
  if (mode === "chart" && Array.isArray(partners) && partners.length === 1) {
    return {
      type: "single-chart",
      flows: [
        {key: "exports", label: "Exports"},
        {key: "imports", label: "Imports"},
        {key: "balance", label: "Trade balance"}
      ],
      suffix: ` of ${categoryString}`
    }
  }
  if (mode === "chart") {
    const prefix = flow === "exports" ? "To" : flow === "imports" ? "From" : "With"
    return {type: "text", text: `${prefix} ${partners.join(", ")}; ${categoryString}`}
  }
  const timeString = timeRange?.[0] === timeRange?.[1] ? timeRange?.[0] : `${timeRange?.[0]}-${timeRange?.[1]}`
  if (mode === "table-top-partners") {
    return {type: "text", text: `${categoryString}; total values between ${timeString}`}
  }
  if (mode === "table-top-categories") {
    return {type: "text", text: `Total values between ${timeString}`}
  }
  if (mode === "table-multi") {
    return {type: "text", text: `By product category; total values between ${timeString}`}
  }
  return {type: "text", text: ""}
}

export function generateFooterText({unit=null, prices=null, country=null, flow=null, isMultiPartner=false}) {
  const currencyName = getCurrencyLabel(unit, {currencyOnly: true, currencyLong: true})
  const sentences = [`All values in ${prices === "constant" ? "constant 2024" : "current"} ${currencyName}.`]
  if (isMultiPartner) {
    if (flow === "exports") {
      sentences.push(`Exports refer to the value of goods traded from ${country} to selected partners.`)
    } else if (flow === "imports") {
      sentences.push(`Imports refer to the value of goods traded from selected partners to ${country}.`)
    } else {
      sentences.push(`A positive trade balance indicates that ${formatString(country, {genitive: true})} exports to a partner exceed its imports from that partner.`)
    }
  }
  return {
    source: {
      href: "https://cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37",
      label: "BACI: International trade database at the Product-level",
      publisher: "CEPII"
    },
    sentences
  }
}


export function buildChartSubtitleHTML(subtitleStructure, {partnerLegend = [], flow = null, palette = {}} = {}) {
  if (subtitleStructure.type === "single-chart") {
    const parts = subtitleStructure.flows.map((item, i) => {
      const prefix = i === 0 ? "" : i === subtitleStructure.flows.length - 1 ? " and " : ", "
      return `${prefix}<span style="color:${palette[item.key] ?? "#333333"}; font-weight:600">${item.label}</span>`
    }).join("")
    return `${parts}${subtitleStructure.suffix}`
  }
  if (partnerLegend.length > 0 && subtitleStructure.type === "text") {
    const baseText = subtitleStructure.text ?? ""
    const sepIdx = baseText.indexOf(";")
    const trailing = sepIdx >= 0 ? baseText.slice(sepIdx) : ""
    const prefix = flow === "exports" ? "To" : flow === "imports" ? "From" : "With"
    const markup = partnerLegend.map(({partner, color}, i) => {
      const isLast = i === partnerLegend.length - 1
      const connector = i === 0 ? " " : isLast ? ", and " : ", "
      return `${connector}<span style="color:${color}; font-weight:600">${partner}</span>`
    }).join("")
    return `${prefix}${markup}${trailing}`
  }
  return null
}

export function generateFileName({
                                   country,
                                   partners,
                                   category,
                                   flow,
                                   timeRange,
                                   mode
                                 } ) {

  let text

  const timeString = timeRange[0] === timeRange[1] ? timeRange[0] : `${timeRange[0]}_${timeRange[1]}`
  const categoryString = category === 'All' ? '_all_products' : formatString(`_${category}`, { fileMode: true });

  if (mode === 'chart') {
    if (partners.length === 1) {
      text = `${formatString(country, {fileMode: true})}_trade_with_${formatString(partners[0], {fileMode: true})}_${timeString}${categoryString}`;
    }
    else {
      text = `trade_with_${formatString(country, {inSentence: true, capitalize: false, fileMode: true})}_${timeString}${categoryString}`;
    }
  }
  else if (mode === 'table-multi') {
    text = `trade_with_${formatString(country, {fileMode: true})}_${timeString}`;
  }
  else if (mode === 'table-partners') {
    if (flow === 'exports') {
      text = `${formatString(country, {fileMode: true})}_export_partners_${timeString}${categoryString}`;
    }
    else {
      text = `${formatString(country, {fileMode: true})}_import_partners_${timeString}${categoryString}`;
    }
  }
  else if (mode === 'table-categories') {
    text = `${formatString(country, {fileMode: true})}_top_${flow}_${timeString}`;
  }

  return text

}
