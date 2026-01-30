const NAV_ITEMS = [
  { id: "single-view", label: "SINGLE", href: "./" },
  { id: "multi-view", label: "MULTI", href: "./multi" },
  { id: "faqs", label: "FAQs", href: "./faqs" }
]

export function NavMenu({ currentPage }) {
  return (
    <div
      className="mt-4 mb-16 flex items-end justify-end gap-10 text-xl font-semibold"
      style={{ fontFamily: "Colfax, Helvetica, sans-serif" }}
      aria-label="Primary"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === currentPage
        return (
          <a
            key={item.id}
            href={item.href}
            className={`group flex flex-col items-center gap-.5 tracking-wide transition-colors ${
              isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-700"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <span>{item.label}</span>
            <span
              aria-hidden
              className={`h-0.5 rounded-full transition-all duration-150 ${
                isActive
                  ? "w-full bg-slate-900"
                  : "w-1 ml-0 bg-slate-300 group-hover:w-full group-hover:bg-slate-500"
              }`}
            />
          </a>
        )
      })}
    </div>
  )
}
