import {downloadXLSX} from "./downloads.js"
import {generateFileName} from "./textGenerators.js"

export function downloadTradeData(data, params) {
  if (!Array.isArray(data) || !data.length) return
  downloadXLSX(data, generateFileName(params))
}
