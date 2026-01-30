import React from "npm:react"

export function DownloadButton({onClick, disabled = false}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 text-md font-medium tracking-wide text-slate-900 transition hover:cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      style={{ fontFamily: "Italian plate, Helvetica, sans-serif" }}
    >
      <span>Download data</span>
      <DownloadIcon size={16} />
    </button>
  )
}

function DownloadIcon({className="", size=18}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
    >
      <rect x="64" y="64" width="384" height="384" rx="48" fill="currentColor" />
      <rect x="96" y="96" width="320" height="320" rx="24" fill="white" />
      <rect x="144" y="208" width="48" height="160" fill="currentColor" />
      <rect x="232" y="160" width="48" height="208" fill="currentColor" />
      <rect x="320" y="256" width="48" height="112" fill="currentColor" />
    </svg>
  )
}
