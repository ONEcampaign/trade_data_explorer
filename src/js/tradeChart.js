import * as Plot from "npm:@observablehq/plot"
import {utcYear} from "npm:d3-time"
import {timeFormat} from "npm:d3-time-format"
import {formatValue, getCurrencyLabel} from "npm:@one-data/observable-themes/utils"
import {singlePalette, multiPalette} from "./colors.js"
import {formatString, plotHeight} from "./utils.js"


function scaledYLabel(unit, scale) {
  return getCurrencyLabel(unit, {suffix: scale?.suffix})
}


export function baseViz(data, partners, unit, flow, width, {wide = false, scale = null} = {}) {
  const isPhone = window.screen.width < 800
  const isMulti = partners.length > 1

  const formattedData = data.map((row) => ({
    ...row,
    year: new Date(row.year, 1, 1),
  }))

  const plotData = formattedData.flatMap(({year, partner, imports, exports, balance}) => [
    {Year: year, Partner: partner, Flow: "imports", Value: imports},
    {Year: year, Partner: partner, Flow: "exports", Value: exports},
    {Year: year, Partner: partner, Flow: "balance", Value: balance},
  ]).filter((d) => d.Value !== null)

  const seriesBreaks = (() => {
    let foundNonNull = false, foundGap = false;
    return data.some(row => {
      if (row.balance !== null) {
        if (foundGap) return true;
        foundNonNull = true;
      } else if (foundNonNull) {
        foundGap = true;
      }
      return false;
    });
  })()

  const singleValue = data.filter(d => d.balance !== null).length === 1

  if (isMulti) {
    return plotMultiPartner(plotData, unit, flow, width, {isPhone, seriesBreaks, singleValue, scale});
  } else {
    return plotSinglePartner(plotData, unit, width, {isPhone, wide, seriesBreaks, singleValue, scale});
  }
}


export function plotSinglePartner(data, unit, width, {isPhone = false, wide = false, seriesBreaks = false, singleValue = false, scale = null} = {}) {
  const formatYear = timeFormat("%Y")

  return Plot.plot({
    width,
    height: plotHeight(width),
    marginTop: 25,
    marginRight: 25,
    marginBottom: 25,
    marginLeft: 40,
    x: {
      inset: 5,
      label: null,
      tickSize: 0,
      ticks: 5,
      grid: false,
      tickFormat: "%Y",
      tickPadding: 10,
      interval: utcYear,
    },
    y: {
      inset: 5,
      label: scaledYLabel(unit, scale),
      labelArrow: false,
      tickSize: 0,
      ticks: 4,
      grid: true,
      ...(scale && scale.divisor !== 1
        ? {tickFormat: d => (d / scale.divisor).toLocaleString("en-US", {maximumFractionDigits: 1})}
        : {})
    },
    color: singlePalette,
    marks: [
      Plot.rectY(data, {
        filter: (d) => d.Flow !== "balance",
        x: "Year",
        y: "Value",
        fill: "Flow",
        fillOpacity: 0.75,
      }),

      Plot.ruleY([0], {stroke: "black", strokeWidth: 0.5}),

      Plot.line(data, {
        filter: (d) => d.Flow === "balance",
        x: "Year",
        y: "Value",
        stroke: "Flow",
        curve: "linear",
        strokeWidth: 2.5,
      }),

      ...(seriesBreaks || singleValue ? [
        Plot.dot(data, {
          filter: (d) => d.Flow === "balance",
          x: "Year",
          y: "Value",
          fill: "Flow",
          r: 3
        })
      ] : []),

      Plot.tip(data, Plot.pointerX({
        x: "Year",
        y: "Value",
        fill: "Flow",
        format: {
          x: (d) => formatYear(d),
          y: (d) => scale
            ? (d / scale.divisor).toLocaleString("en-US", {minimumFractionDigits: 1, maximumFractionDigits: 1})
            : formatValue(d).label,
          fill: (d) => formatString(d, {}),
          stroke: true,
        },
        lineHeight: 1.25,
        fontSize: 12,
        fontFamily: "'Italian Plate', Helvetica, sans-serif",
      })),
    ],
  });
}


export function plotMultiPartner(data, unit, flow, width, {isPhone = false, seriesBreaks = false, singleValue = false, scale = null} = {}) {
  const formatYear = timeFormat("%Y")

  const colorPalette = {
    domain: [...new Set(data.map(row => row["Partner"]))].sort(),
    range: multiPalette
  }

  return Plot.plot({
    width,
    height: width * 0.5,
    marginTop: 25,
    marginRight: 25,
    marginBottom: 25,
    marginLeft: 40,
    x: {
      inset: 5,
      label: null,
      tickSize: 0,
      ticks: 5,
      grid: false,
      tickFormat: "%Y",
      tickPadding: 10,
      interval: utcYear,
    },
    y: {
      inset: 5,
      label: scaledYLabel(unit, scale),
      labelArrow: false,
      tickSize: 0,
      ticks: 4,
      grid: true,
      ...(scale && scale.divisor !== 1
        ? {tickFormat: d => (d / scale.divisor).toLocaleString("en-US", {maximumFractionDigits: 1})}
        : {})
    },
    color: colorPalette,
    marks: [
      Plot.ruleY([0], {stroke: "black", strokeWidth: 0.5}),

      Plot.line(data, {
        filter: (d) => d.Flow === flow,
        sort: (a, b) => a.Year - b.Year,
        x: "Year",
        y: "Value",
        z: "Partner",
        curve: "linear",
        stroke: "Partner",
        strokeWidth: 2,
      }),

      ...(seriesBreaks || singleValue ? [
        Plot.dot(data, {
          filter: (d) => d.Flow === flow,
          x: "Year",
          y: "Value",
          fill: "Partner",
          r: 3
        })
      ] : []),

      Plot.tip(data, Plot.pointer({
        filter: (d) => d.Flow === flow && d.Value !== 0,
        x: "Year",
        y: "Value",
        fill: "Partner",
        format: {
          fill: true,
          x: (d) => formatYear(d),
          y: (d) => scale
            ? (d / scale.divisor).toLocaleString("en-US", {minimumFractionDigits: 1, maximumFractionDigits: 1})
            : formatValue(d).label,
          stroke: true,
        },
        lineHeight: 1.25,
        fontSize: 12,
        fontFamily: "'Italian Plate', Helvetica, sans-serif",
      })),
    ],
  });
}
