import React from "npm:react"
import {baseViz} from "../js/visuals.js"
import {generateTitle, generateSubtitle, generateFooterText, generateFileName} from "../js/textGenerators.js"
import {multiPalette} from "../js/colors.js"
import {ONEVisual} from "./ONEVisual.js"

export function TradePlot({
  data = [],
  unit,
  flow,
  country,
  category,
  timeRange,
  prices,
  loading = false,
  error = null,
  emptyMessage = "No data for the selected filters.",
  onDownload,
  partners = null,
  isMultiPartner = false,
  wide = true
}) {
  const plotRef = React.useRef(null)
  const [width, setWidth] = React.useState(0)
  const normalizedPartners = React.useMemo(() => {
    if (Array.isArray(partners) && partners.length) {
      return [...new Set(partners)].sort((a, b) => String(a).localeCompare(String(b)))
    }
    return ["the rest of the world"]
  }, [partners])

  React.useEffect(() => {
    const node = plotRef.current
    if (!node || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(node)
    setWidth(node.clientWidth)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    const node = plotRef.current
    if (!node) return
    if (!data.length || !width) {
      node.innerHTML = ""
      return
    }
    const plotNode = baseViz(data, normalizedPartners, unit, flow, width, {wide})
    node.innerHTML = ""
    node.appendChild(plotNode)
    return () => {
      if (plotNode?.remove) {
        plotNode.remove()
      }
    }
  }, [data, unit, flow, width, normalizedPartners, wide])

  const titleText = React.useMemo(
    () => generateTitle({country, partners: normalizedPartners, flow, mode: "plot"}),
    [country, normalizedPartners, flow]
  )

  const subtitleStructure = React.useMemo(
    () => generateSubtitle({partners: normalizedPartners, flow, category, timeRange, mode: "plot"}),
    [normalizedPartners, flow, category, timeRange]
  )

  const footerContent = React.useMemo(
    () => generateFooterText({unit, prices, country, flow, isMultiPartner}),
    [unit, prices, country, flow, isMultiPartner]
  )

  const plotFileName = React.useMemo(
    () => generateFileName({country, partners: normalizedPartners, category, flow, timeRange, mode: "plot"}),
    [country, normalizedPartners, category, flow, timeRange]
  )

  const hasData = data.length > 0
  const disableDownload = loading || error || !hasData
  const partnerLegend = React.useMemo(() => {
    if (!isMultiPartner) return []
    const legendSource = (hasData
      ? Array.from(new Set(data.map((row) => row?.partner).filter(Boolean)))
      : Array.isArray(partners)
        ? partners
        : [])
      .sort((a, b) => String(a).localeCompare(String(b)))

    return legendSource.map((partner, index) => ({
      partner,
      color: multiPalette[index % multiPalette.length]
    }))
  }, [isMultiPartner, data, partners, hasData])

  const coloredSubtitle = React.useMemo(() => {
    if (!partnerLegend.length || subtitleStructure.type !== "text") return null
    const baseText = subtitleStructure.text ?? ""
    const separatorIndex = baseText.indexOf(";")
    const trailing = separatorIndex >= 0 ? baseText.slice(separatorIndex) : ""
    const prefix = flow === "exports" ? "To" : flow === "imports" ? "From" : "With"
    const legendMarkup = partnerLegend.map(({partner, color}, index) => {
      const isLast = index === partnerLegend.length - 1
      const needsComma = index > 0 && !isLast
      const needsAnd = index > 0 && isLast
      const connector = needsComma ? ", " : needsAnd ? " and " : " "
      return `${connector}<span style="color:${color}; font-weight:600">${partner}</span>`
    }).join("")
    return `${prefix}${legendMarkup}${trailing}`
  }, [partnerLegend, subtitleStructure, flow])

  const handleDownload = React.useCallback(() => {
    if (!disableDownload) {
      onDownload?.()
    }
  }, [disableDownload, onDownload])

  const subtitleData = React.useMemo(() => {
    if (subtitleStructure.type === "single-plot") {
      const parts = subtitleStructure.flows.map((item, index) => {
        const isLast = index === subtitleStructure.flows.length - 1
        const prefix = index === 0 ? "" : isLast ? " and " : ", "
        const color =
          item.key === "balance"
            ? "#A20021"
            : item.key === "exports"
              ? "#F7CE5B"
              : "#1A9BA3"
        return `${prefix}<span style="color:${color}; font-weight:600">${item.label}</span>`
      }).join("")
      return {
        text: `${parts}${subtitleStructure.suffix}`,
        isHTML: true
      }
    }
    if (coloredSubtitle) {
      return {text: coloredSubtitle, isHTML: true}
    }
    return {text: subtitleStructure.text, isHTML: false}
  }, [subtitleStructure, coloredSubtitle])

  return (
    <ONEVisual
      title={titleText}
      subtitle={subtitleData.text}
      subtitleIsHTML={subtitleData.isHTML}
      source={footerContent.source}
      note={footerContent.sentences.join(" ")}
      loading={loading}
      error={error}
      empty={!hasData}
      emptyMessage={emptyMessage}
      onDownload={onDownload ? handleDownload : undefined}
      plotFileName={plotFileName}
    >
      <div ref={plotRef} className="h-full w-full" />
    </ONEVisual>
  )
}
