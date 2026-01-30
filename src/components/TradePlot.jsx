import React from "npm:react"
import {baseViz} from "../js/visuals.js"
import {getTitle, getSubtitle, getFooterContent} from "../js/textGenerators.js"
import {multiPalette} from "../js/colors.js"
import {DownloadButton} from "./DownloadButton.js"
import {logo} from "@one-data/observable-themes/use-images"

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
      return partners
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
    () => getTitle({country, partners: normalizedPartners, flow, mode: "plot"}),
    [country, normalizedPartners, flow]
  )

  const subtitleStructure = React.useMemo(
    () => getSubtitle({partners: normalizedPartners, flow, category, timeRange, mode: "plot"}),
    [normalizedPartners, flow, category, timeRange]
  )

  const footerContent = React.useMemo(
    () => getFooterContent({unit, prices, country, flow, isMultiPartner}),
    [unit, prices, country, flow, isMultiPartner]
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
    return (
      <p className="text-lg text-slate-500" style={{ fontFamily: "Italian plate, Helvetica, sans-serif" }}>
        {prefix}
        {partnerLegend.map(({partner, color}, index) => {
          const isLast = index === partnerLegend.length - 1
          const needsComma = index > 0 && !isLast
          const needsAnd = index > 0 && isLast
          return (
            <React.Fragment key={partner}>
              {needsComma ? ", " : needsAnd ? " and " : " "}
              <span style={{ color, fontWeight: 600 }}>{partner}</span>
            </React.Fragment>
          )
        })}
        {trailing}
      </p>
    )
  }, [partnerLegend, subtitleStructure, flow])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: "Italian plate, Helvetica, sans-serif" }}>
          {titleText}
        </h2>
        {subtitleStructure.type === "single-plot" ? (
          <p className="text-lg text-slate-black" style={{ fontFamily: "Italian plate, Helvetica, sans-serif" }}>
            {subtitleStructure.flows.map((item, index) => {
              const isLast = index === subtitleStructure.flows.length - 1
              const prefix = index === 0 ? "" : isLast ? " and " : ", "
              const colorClass =
                item.key === "balance"
                  ? "text-[#A20021] "
                  : item.key === "exports"
                    ? "text-[#F7CE5B] font-bold"
                    : "text-[#1A9BA3] font-bold"
              return (
                <React.Fragment key={item.key}>
                  {prefix}
                  <span className={colorClass}>{item.label}</span>
                </React.Fragment>
              )
            })}
            <span>{subtitleStructure.suffix}</span>
          </p>
        ) : (
          coloredSubtitle ?? (
            <p className="text-sm text-slate-500">{subtitleStructure.text}</p>
          )
        )}
      </div>
      <div className="relative min-h-[260px] w-full rounded-2xl bg-white">
        <div
          ref={plotRef}
          className={`h-full rounded-2xl transition duration-200 ${loading ? "blur-sm" : ""}`}
        />
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/60 backdrop-blur">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            <p className="text-sm font-medium text-slate-700">Loading data...</p>
          </div>
        )}
        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 text-sm text-red-600">
            Unable to load data. Please try different filters.
          </div>
        )}
        {!loading && !error && !hasData && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
      <div className="flex flex-row justify-between">
        <div className="mt-4 text-xs text-slate-500" style={{ fontFamily: "Italian plate, Helvetica, sans-serif" }}>
          <p>
            Source: <a className="text-slate-800 underline" href={footerContent.source.href} target="_blank" rel="noopener noreferrer">{footerContent.source.label}</a>. {footerContent.source.publisher}.
          </p>
          {footerContent.sentences.map((sentence, index) => (
            <p key={index}>{sentence}</p>
          ))}
        </div>
        <div className="flex items-center justify-end">
          <a
            href="https://data.one.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity duration-200 hover:opacity-50"
          >
            <img src={logo} alt="The ONE Campaign logo" className="h-5 w-auto" />
          </a>
        </div>
      </div>
      <div>
        {onDownload && (
          <DownloadButton onClick={onDownload} disabled={disableDownload} />
        )}
      </div>
    </div>
  )
}
