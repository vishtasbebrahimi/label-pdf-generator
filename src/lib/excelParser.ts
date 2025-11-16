import * as XLSX from 'xlsx';

export interface ParsedRow {
  name: string;
  code: string;
  quantity: number;
}

function normalizeHeader(value: any): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\u200c/g, ''); // حذف فاصله مجازی
}

function detectHeaders(headers: any[]) {
  const normalized = headers.map(normalizeHeader);

  const findIndex = (keywords: string[]): number => {
    return normalized.findIndex((h) => keywords.some((kw) => kw && h.includes(kw)));
  };

  const nameIndex = findIndex([
    'نامکالا',
    'ناممحصول',
    'productname',
    'itemname',
    'name'
  ]);

  const codeIndex = findIndex([
    'کدانبارکالا',
    'کدانبار',
    'کدکالا',
    'sku',
    'itemcode',
    'warehousecode',
    'code'
  ]);

  const quantityIndex = findIndex([
    'تعداد',
    'تیراژ',
    'تعدادلیبل',
    'quantity',
    'qty',
    'count'
  ]);

  if (nameIndex === -1 || codeIndex === -1 || quantityIndex === -1) {
    throw new Error(
      'ستون‌های لازم در فایل اکسل پیدا نشدند. لطفاً مطمئن شوید ستون‌های «نام کالا»، «کد انبار کالا» و «تعداد» وجود دارند.'
    );
  }

  return { nameIndex, codeIndex, quantityIndex };
}

export async function parseTransfersExcel(file: File): Promise<ParsedRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  if (!workbook.SheetNames.length) {
    throw new Error('فایل اکسل هیچ شیتی ندارد.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: ''
  });

  if (!rows.length) {
    throw new Error('فایل اکسل خالی است.');
  }

  const headerRow = rows[0];
  const { nameIndex, codeIndex, quantityIndex } = detectHeaders(headerRow);

  const parsed: ParsedRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawName = row[nameIndex];
    const rawCode = row[codeIndex];
    const rawQty = row[quantityIndex];

    const name = rawName != null ? String(rawName).trim() : '';
    const code = rawCode != null ? String(rawCode).trim() : '';

    let quantity = 0;
    if (rawQty != null && rawQty !== '') {
      const n = Number(rawQty);
      if (!Number.isNaN(n) && Number.isFinite(n) && n > 0) {
        quantity = Math.floor(n);
      }
    }

    // اگر کل ردیف خالی بود، رد شو
    if (!name && !code && quantity === 0) {
      continue;
    }

    // بدون کد انبار لیبل نساز
    if (!code) {
      continue;
    }

    // تعداد صفر یا منفی، نادیده بگیر
    if (quantity <= 0) {
      continue;
    }

    parsed.push({
      name: name || code,
      code,
      quantity
    });
  }

  if (!parsed.length) {
    throw new Error(
      'هیچ ردیف معتبری برای تولید لیبل پیدا نشد (مقادیر «کد انبار کالا» و «تعداد» باید پر و بزرگتر از صفر باشند).'
    );
  }

  return parsed;
}
