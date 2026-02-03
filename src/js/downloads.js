import {toPng} from 'npm:html-to-image';
import {utils, writeFile} from "npm:xlsx";

export function downloadPNG(target, filename) {
    const element = typeof target === "string" ? document.getElementById(target) : target
    if (!element) {
        console.error("Element not found for PNG download.")
        return
    }

    toPng(element, { pixelRatio: 2, backgroundColor: "white" })
        .then((dataUrl) => {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${filename}.png`;
            link.click();
        })
        .catch((error) => {
            console.error('Error capturing the element as an image:', error);
        });
}

// https://observablehq.observablehq.cloud/pangea/party/xlsx-downloads
export function downloadXLSX(data, filename) {

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet);
    writeFile(workbook, `${filename}.xlsx`);
}
