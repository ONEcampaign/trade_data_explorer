import {formatString, getUnitLabel} from "./utils.js"

export function getTitle({country=null, partners=null, flow=null, group=null, mode}) {
  if (mode === "plot") {
    if (Array.isArray(partners) && partners.length === 1) {
      return `${formatString(country, {genitive: true})} trade with ${partners[0]}`
    }
    return `${formatString(country, {genitive: true})} ${formatString(flow, {capitalize: false})}`
  }
  if (mode === "table-top-partners") {
    if (group === "All countries") {
      return flow === "exports"
        ? `${formatString(country, {genitive: true})} exports go to ...`
        : `${formatString(country, {genitive: true})} imports come from ...`
    }
    return flow === "exports"
      ? `${formatString(country, {genitive: true})} top export destinations among ${group}`
      : `${formatString(country, {genitive: true})} top import origins among ${group}`
  }
  if (mode === "table-top-categories") {
    if (group === "All countries") {
      return `${formatString(country, {verb: flow})} a lot of ...`
    }
    return flow === "exports"
      ? `${formatString(country, {genitive: true})} top exports to ${group}`
      : `${formatString(country, {genitive: true})} top imports from ${group}`
  }
  return ""
}

export function getSubtitle({partners=null, flow=null, category=null, timeRange=null, mode}) {
  const categoryString = category === "All" ? "All products" : category
  if (mode === "plot" && Array.isArray(partners) && partners.length === 1) {
    return {
      type: "single-plot",
      flows: [
        {key: "exports", label: "Exports"},
        {key: "imports", label: "Imports"},
        {key: "balance", label: "Trade balance"}
      ],
      suffix: `; ${categoryString}`
    }
  }
  if (mode === "plot") {
    const prefix = flow === "exports" ? "To" : flow === "imports" ? "From" : "With"
    return {type: "text", text: `${prefix} ${partners.join(", ")}; ${categoryString}`}
  }
  const timeString = timeRange?.[0] === timeRange?.[1] ? timeRange?.[0] : `${timeRange?.[0]}-${timeRange?.[1]}`
  if (mode === "table-top-partners") {
    return {type: "text", text: `${categoryString}; total values between ${timeString}`}
  }
  if (mode === "table-top-categories") {
    return {type: "text", text: `Product categories; total values between ${timeString}`}
  }
  if (mode === "table-multi") {
    return {type: "text", text: `By product category; total values between ${timeString}`}
  }
  return {type: "text", text: ""}
}

export function getFooterContent({unit=null, prices=null, country=null, flow=null, isMultiPartner=false}) {
  const unitLabel = getUnitLabel(unit, {})
  const sentences = [`All values in ${prices === "constant" ? "constant 2024" : "current"} ${unitLabel}.`]
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

  if (mode === 'plot') {
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
