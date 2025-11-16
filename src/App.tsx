import React, { useState } from 'react';
import { parseTransfersExcel, ParsedRow } from './lib/excelParser';
import { generateLabelsPdf } from './lib/pdfGenerator';

type Status = 'idle' | 'parsing' | 'generating' | 'success' | 'error';

const App: React.FC = () => {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [labelCount, setLabelCount] = useState<number>(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setPdfUrl(null);
    setLabelCount(0);

    const file = event.target.files?.[0] ?? null;
    if (file && !file.name.match(/\.(xlsx|xls)$/i)) {
      setError('لطفاً یک فایل Excel با پسوند .xlsx یا .xls انتخاب کنید.');
      setExcelFile(null);
      return;
    }

    setExcelFile(file);
  };

  const handleGenerate = async () => {
    if (!excelFile) {
      setError('ابتدا فایل Excel را انتخاب کنید.');
      return;
    }

    try {
      setStatus('parsing');
      setError(null);

      const rows: ParsedRow[] = await parseTransfersExcel(excelFile);
      const nonZeroRows = rows.filter((r) => r.quantity > 0);
      const totalLabels = nonZeroRows.reduce((sum, r) => sum + r.quantity, 0);

      if (!nonZeroRows.length || totalLabels === 0) {
        throw new Error('در فایل اکسل هیچ ردیفی با مقدار «تعداد» بزرگتر از صفر پیدا نشد.');
      }

      setStatus('generating');

      const pdfBytes = await generateLabelsPdf(nonZeroRows);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      setPdfUrl(url);
      setLabelCount(totalLabels);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setPdfUrl(null);
      setLabelCount(0);

      const message =
        err?.message ||
        'خطا در پردازش فایل رخ داد. لطفاً ساختار فایل Excel را بررسی کرده و دوباره تلاش کنید.';
      setError(message);
    }
  };

  const canGenerate =
    !!excelFile && (status === 'idle' || status === 'error' || status === 'success');

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-2xl p-6 md:p-8">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            ابزار تولید لیبل انبار از روی Excel
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            فایل <span className="font-mono bg-slate-100 px-1 rounded">transfers.xlsx</span> را
            بارگذاری کنید تا براساس ستون‌های
            <strong> «نام کالا»</strong>، <strong>«کد انبار کالا»</strong> و{' '}
            <strong>«تعداد»</strong>، برای هر ردیف به تعداد موردنیاز لیبل دوبه‌دو مشابه نمونهٔ
            سیستم فعلی ساخته شود.
          </p>
        </header>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              فایل Excel ورودی
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-700
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-slate-100 file:text-slate-700
                  hover:file:bg-slate-200"
              />
              {excelFile && (
                <span className="text-xs text-slate-500 truncate">
                  فایل انتخاب‌شده: {excelFile.name}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              حداقل ستون‌های لازم: «نام کالا»، «کد انبار کالا» و «تعداد». اگر عنوان ستون‌ها کمی
              متفاوت باشد، سیستم سعی می‌کند آن‌ها را به‌صورت خودکار تشخیص دهد.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2.5
                text-sm font-semibold text-white shadow-sm
                bg-slate-900 hover:bg-slate-800
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === 'parsing' && 'در حال خواندن Excel...'}
              {status === 'generating' && 'در حال ساخت PDF لیبل‌ها...'}
              {(status === 'idle' || status === 'success' || status === 'error') && 'تولید لیبل'}
            </button>

            {status === 'success' && (
              <span className="text-xs text-emerald-600">
                {labelCount.toLocaleString('fa-IR')} لیبل تولید شد.
              </span>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {(status === 'parsing' || status === 'generating') && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>در حال پردازش فایل... لطفاً صفحه را نبندید.</span>
            </div>
          )}

          {pdfUrl && status === 'success' && (
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-700">
                PDF آماده است. می‌توانید آن را دانلود کرده و روی لیبل‌پرینتر دو-ستونه فعلی خود
                پرینت بگیرید.
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <a
                  href={pdfUrl}
                  download="labels-output.pdf"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  دانلود PDF لیبل‌ها
                </a>
                <span className="text-xs text-slate-400">
                  اندازه صفحه: 565 × 141 پوینت (دو لیبل کنار هم، مشابه فایل نمونه).
                </span>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-6 border-t border-slate-100 pt-3">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            این ابزار کاملاً آفلاین روی مرورگر شما اجرا می‌شود؛ هیچ داده‌ای به سرور ارسال
            نمی‌شود و برای محیط‌های عملیاتی انبار ایفا مناسب است.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
