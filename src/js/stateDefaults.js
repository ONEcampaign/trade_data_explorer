import {maxTimeRange} from "./inputValues.js"

export const DEFAULT_SINGLE_COUNTRY = "South Africa"
export const DEFAULT_MULTI_COUNTRY = "Kenya"
export const DEFAULT_MULTI_PARTNERS = ["Canada"]

export function getSingleDefaultTimeRange(windowSize = 20) {
  const end = Number(maxTimeRange[1])
  const start = Number(end - windowSize)
  return [start, end]
}

export function getMultiDefaultTimeRange(windowSize = 10) {
  const end = Number(maxTimeRange[1])
  const start = Number(end - windowSize)
  return [start, end]
}
