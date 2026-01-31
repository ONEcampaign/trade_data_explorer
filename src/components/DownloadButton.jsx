import React from "npm:react"

export function DownloadButton({onClick, disabled = false, label = "Download data"}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 text-md font-medium tracking-wide text-black transition hover:cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-60"
      style={{ fontFamily: "Italian plate, Helvetica, sans-serif" }}
    >
      <span>{label}</span>
      <DownloadIcon size={16} />
    </button>
  )
}

function DownloadIcon({className="", size=18}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
    >
      <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
    </svg>
  )
}
