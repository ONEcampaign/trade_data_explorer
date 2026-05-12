export const APP_TITLE = "Trade Explorer"

export const APP_DESCRIPTION =
  "<b>Single</b> view gives an overview of a country's trade position with the rest of the world.<br> " +
  "<b>Multi</b> view lets you explore trade between a selected country and up to five trading partners."

export const NAV_ITEMS = [
    { id: "single", label: "SINGLE", href: "./" },
    { id: "multi",  label: "MULTI",  href: "./multi.html" },
    { id: "faqs",       label: "FAQs",       href: "./faqs.html" }
]

export const SCALE = 6 // Values are normalised to millions by getValueForUnit (÷ 1e6)