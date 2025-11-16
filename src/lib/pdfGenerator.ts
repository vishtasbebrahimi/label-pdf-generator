import { PDFDocument } from 'pdf-lib';
import type { ParsedRow } from './excelParser';
import { createLabelPngDataUrl, type LabelData } from './labelImage';

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

export async function generateLabelsPdf(rows: ParsedRow[]): Promise<Uint8Array> {
  const instances: LabelData[] = [];

  for (const row of rows) {
    for (let i = 0; i < row.quantity; i++) {
      instances.push({ code: row.code, name: row.name });
    }
  }

  if (instances.length === 0) {
    throw new Error('هیچ لیبلی برای تولید وجود ندارد.');
  }

  const pdfDoc = await PDFDocument.create();

  // ابعاد صفحه را از روی barcode.pdf استخراج کرده‌ایم:
  // width = 565pt, height = 141pt (دو لیبل کنار هم روی رول فعلی)
  const pageWidth = 565;
  const pageHeight = 141;

  const labelWidth = pageWidth / 2;
  const horizontalPadding = 5;

  const cache = new Map<string, any>();

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let labelIndexOnPage = 0;

  for (let i = 0; i < instances.length; i++) {
    if (labelIndexOnPage >= 2) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      labelIndexOnPage = 0;
    }

    const label = instances[i];
    const key = `${label.code}__${label.name}`;

    let image = cache.get(key);
    if (!image) {
      const dataUrl = createLabelPngDataUrl(label);
      const pngBytes = dataUrlToUint8Array(dataUrl);
      image = await pdfDoc.embedPng(pngBytes);
      cache.set(key, image);
    }

    const availableWidth = labelWidth - 2 * horizontalPadding;
    const scale = availableWidth / image.width;
    const scaled = image.scale(scale);

    const isLeft = labelIndexOnPage === 0;
    const xBase = isLeft ? 0 : labelWidth;

    const x = xBase + horizontalPadding;
    const y = (pageHeight - scaled.height) / 2;

    page.drawImage(image, {
      x,
      y,
      width: scaled.width,
      height: scaled.height
    });

    labelIndexOnPage += 1;
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
