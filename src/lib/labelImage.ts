import JsBarcode from 'jsbarcode';

export interface LabelData {
  code: string;
  name: string;
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (!text) return '';
  let current = text;

  if (ctx.measureText(current).width <= maxWidth) {
    return current;
  }

  while (current.length > 0 && ctx.measureText(current + '…').width > maxWidth) {
    current = current.slice(0, -1);
  }

  return current ? current + '…' : text;
}

/**
 * یک تصویر PNG از کل لیبل (بارکد + کد + نام کالا) می‌سازد
 * تا بدون نگرانی از فونت و راست‌به‌چپ، داخل PDF جاسازی شود.
 */
export function createLabelPngDataUrl(label: LabelData): string {
  const width = 1000;
  const height = 250;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas API در مرورگر پشتیبانی نمی‌شود.');
  }

  // پس‌زمینه سفید
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // بارکد را روی یک canvas جداگانه می‌کشیم
  const barcodeCanvas = document.createElement('canvas');
  // بیشتر کردن عرض و ضخامت بارکد برای خوانایی بهتر
  barcodeCanvas.width = Math.floor(width * 0.98);
  barcodeCanvas.height = 170;

  JsBarcode(barcodeCanvas, label.code || '-', {
    format: 'CODE128',
    displayValue: false,
    margin: 6,
    height: 150,
    width: 4
  });

  const barcodeX = (width - barcodeCanvas.width) / 2;
  const barcodeY = 10;

  ctx.drawImage(barcodeCanvas, barcodeX, barcodeY);

  const barcodeBottom = barcodeY + barcodeCanvas.height;

  // کد کالا زیر بارکد
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
  const codeY = barcodeBottom + 40;
  ctx.fillText(label.code, width / 2, codeY);

  // نام کالا (فارسی) زیر کد
  ctx.font = '28px "Segoe UI", Arial, sans-serif';
  (ctx as any).direction = 'rtl';
  const maxTextWidth = width * 0.9;
  const productText = truncateText(ctx, label.name, maxTextWidth);
  const nameY = codeY + 40;
  ctx.fillText(productText, width / 2, nameY);

  return canvas.toDataURL('image/png');
}
