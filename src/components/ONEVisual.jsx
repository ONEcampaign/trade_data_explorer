import React from "npm:react"
import {DownloadButton} from "./DownloadButton.js"
import {logo} from "@one-data/observable-themes/use-images"

export function ONEVisual({
  title,
  subtitle,
  subtitleIsHTML = false,
  children,
  source,
  note,
  loading = false,
  error = null,
  empty = false,
  emptyMessage = "No data",
  onDownload,
  className = ""
}) {
  const subtitleNode = subtitle
    ? subtitleIsHTML
      ? (
        <h3
          className="text-lg text-slate-500"
          style={{ fontFamily: "Italian plate, Helvetica, sans-serif" }}
          dangerouslySetInnerHTML={{ __html: subtitle }}
        />
      )
      : (
        <h3 className="text-lg text-slate-500" style={{ fontFamily: "Italian plate, Helvetica, sans-serif" }}>
          {subtitle}
        </h3>
      )
    : null

  const handleAction = (action) => {
    if (loading || error || empty) return
    action?.()
  }

  return (
    <section className={`w-full ${className}`}>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: "Italian plate, Helvetica, sans-serif" }}>
          {title}
        </h2>
        {subtitleNode}
      </div>
      <div className="relative mt-4 min-h-[220px] rounded-3xl bg-white/70 p-3 sm:p-4">
        <div className="relative h-full w-full">{children}</div>
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-3xl bg-white/85 backdrop-blur-xl">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            <p className="text-sm font-medium text-slate-700">Loading data...</p>
          </div>
        )}
        {!loading && error && (
          <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/80 text-sm text-red-600">
            Unable to load data. Please try different filters.
          </div>
        )}
        {!loading && !error && empty && (
          <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/80 text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
      <div
        className="mt-6 flex flex-row items-start justify-between gap-4 text-xs text-slate-500"
        style={{ fontFamily: "Italian plate, Helvetica, sans-serif" }}
      >
        <div className="space-y-1">
          {source && (
            <p>
              Source:{' '}
              <a className="text-slate-800 underline" href={source.href} target="_blank" rel="noopener noreferrer">
                {source.label}
              </a>. {source.publisher}.
            </p>
          )}
          {note && <p>{note}</p>}
        </div>
        <div className="flex items-center justify-end sm:justify-center gap-2 shrink-0">
          <a
            href="https://data.one.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity duration-200 hover:opacity-50"
          >
            <img src={logo} alt="The ONE Campaign logo" className="h-5 w-5 object-contain" style={{ minWidth: "1rem" }} />
          </a>
        </div>
      </div>
      {onDownload && (
        <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
          <DownloadButton
            onClick={() => handleAction(onDownload)}
            disabled={loading || empty || !!error}
          />
        </div>
      )}
    </section>
  )
}
