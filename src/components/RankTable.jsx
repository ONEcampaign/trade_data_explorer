import React from "npm:react"
import {baseTable} from "../js/visuals.js"
import {generateTitle, generateSubtitle, generateFooterText} from "../js/textGenerators.js"
import {DownloadButton} from "./DownloadButton.js"
import {logo} from "@one-data/observable-themes/use-images"

export function RankTable({
  data = [],
  flow,
  mainColumn,
  mode,
  country,
  category,
  timeRange,
  unit,
  prices,
  group = "All countries",
  partners = null,
  isMultiPartner = false,
  multiMode = false,
  loading = false,
  error = null,
  emptyMessage = "No data for the selected filters.",
  onDownload
}) {
  const tableRef = React.useRef(null)
  const [width, setWidth] = React.useState(0)
  const normalizedPartners = React.useMemo(() => {
    if (Array.isArray(partners) && partners.length) {
      return [...new Set(partners)].sort((a, b) => String(a).localeCompare(String(b)))
    }
    return ["the world"]
  }, [partners])

  React.useEffect(() => {
    const node = tableRef.current
    if (!node) return
    if (typeof ResizeObserver === "undefined") {
      setWidth(node.clientWidth)
      return
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(node)
    setWidth(node.clientWidth)
    return () => observer.disconnect()
  }, [])

  const hasRows = Array.isArray(data) && data.length > 0

  React.useEffect(() => {
    const node = tableRef.current
    if (!node) return
    if (!width || !hasRows) {
      node.innerHTML = ""
      return
    }
    const tableNode = baseTable(data, flow, mainColumn, width, {
      partners: normalizedPartners,
      multiMode
    })
    if (!tableNode) {
      node.innerHTML = ""
      return
    }
    node.innerHTML = ""
    node.appendChild(tableNode)
    return () => {
      if (tableNode?.remove) {
        tableNode.remove()
      }
    }
  }, [data, flow, mainColumn, width, hasRows, normalizedPartners, multiMode])

  const titleText = React.useMemo(
    () => {
      const titleMode = mode === "table-multi" ? "plot" : mode
      return generateTitle({country, partners: normalizedPartners, flow, group, mode: titleMode})
    },
    [country, normalizedPartners, flow, group, mode]
  )

  const subtitle = React.useMemo(
    () => generateSubtitle({category, timeRange, flow, mode}),
    [category, timeRange, flow, mode]
  )

  const footerContent = React.useMemo(
    () => generateFooterText({unit, prices, country, flow, isMultiPartner: isMultiPartner || multiMode}),
    [unit, prices, country, flow, isMultiPartner, multiMode]
  )

  return (
    <section className="flex h-full w-full flex-col gap-4 border-2 border-black bg-white p-4 sm:p-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: "Italian plate, Helvetica, sans-serif" }}>
          {titleText}
        </h2>
        {subtitle?.text && (
          <h3 className="text-lg text-slate-600" style={{ fontFamily: "Italian plate, Helvetica, sans-serif" }}>
            {subtitle.text}
          </h3>
        )}
      </div>
      <div className="relative min-h-[220px] flex-1 rounded-2xl bg-white p-3 sm:p-4">
        <div ref={tableRef} className="min-h-[180px] max-w-full overflow-auto" />
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/85 backdrop-blur-xl">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            <p className="text-sm font-medium text-slate-700">Loading data...</p>
          </div>
        )}
        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 text-sm text-red-600">
            Unable to load data. Please try different filters.
          </div>
        )}
        {!loading && !error && !hasRows && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col text-xs text-slate-500" style={{ fontFamily: "Italian plate, Helvetica, sans-serif" }}>
          <p>
            Source: <a className="text-slate-800 underline" href={footerContent.source.href} target="_blank" rel="noopener noreferrer">{footerContent.source.label}</a>. {footerContent.source.publisher}.
          </p>
          {footerContent.sentences.map((sentence, index) => (
            <p key={index}>{sentence}</p>
          ))}
        </div>
        <div className="flex items-center justify-end sm:justify-center">
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
      {onDownload && (
        <div>
          <DownloadButton onClick={onDownload} disabled={!hasRows || loading} />
        </div>
      )}
    </section>
  )
}
