import React from "npm:react"
import {baseTable} from "../js/visuals.js"
import {generateTitle, generateSubtitle, generateFooterText} from "../js/textGenerators.js"
import {ONEVisual} from "./ONEVisual.js"

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
    () => generateFooterText({unit, prices, country, flow, isMultiPartner: isMultiPartner}),
    [unit, prices, country, flow, isMultiPartner, multiMode]
  )

  const handleDownload = React.useCallback(() => {
    if (!loading && hasRows) {
      onDownload?.()
    }
  }, [loading, hasRows, onDownload])

  return (
    <ONEVisual
      title={titleText}
      subtitle={subtitle?.text}
      source={footerContent.source}
      note={footerContent.sentences.join(" ")}
      loading={loading}
      error={error}
      empty={!hasRows}
      emptyMessage={emptyMessage}
      onDownload={onDownload ? handleDownload : undefined}
    >
      <div ref={tableRef} className="h-full w-full" />
    </ONEVisual>
  )
}
