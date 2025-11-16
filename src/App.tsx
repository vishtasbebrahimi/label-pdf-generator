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

      const message = err?.message || "An error occurred while processing the file.";
      setError(message);
    }
  };

  const canGenerate =
    !!excelFile && (status === 'idle' || status === 'error' || status === 'success');

  const renderStatusChip = () => {
    if (status === 'idle') return null;
    if (status === 'parsing' || status === 'generating') {
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          در حال پردازش فایل...
        </span>
      );
    }
    if (status === 'success') {
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {labelCount.toLocaleString('fa-IR')} لیبل با موفقیت تولید شد.
        </span>
      );
    }
    if (status === 'error') {
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[11px] font-medium text-red-700">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          خطا در پردازش
        </span>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 md:px-8 md:py-10">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="bg-gradient-to-l from-sky-400 to-emerald-300 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent md:text-3xl">
              EFA Label PDF Generator
            </h1>
            <p className="mt-1 text-xs text-slate-300 md:text-sm">
              تولید PDF لیبل‌های انبار (دو لیبل در هر صفحه) از روی فایل{' '}
              <span className="font-mono text-sky-300">transfers.xlsx</span> بدون نیاز به هیچ
              سرویس بیرونی.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            {renderStatusChip()}
            <span className="text-[10px] text-slate-500">
              React · Vite · TypeScript · pdf-lib · JsBarcode · xlsx
            </span>
          </div>
        </header>

        {/* Main card */}
        <main className="flex flex-1 flex-col gap-6 md:flex-row">
          {/* Left side: form */}
          <section className="w-full md:w-3/5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/40 backdrop-blur">
              <h2 className="mb-4 text-sm font-semibold text-slate-100">
                ۱. انتخاب فایل Excel و تولید لیبل
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-200">
                    فایل Excel ورودی
                  </label>
                  <div
                    className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 hover:border-sky-400/70"
                  >
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="block w-full cursor-pointer text-xs text-slate-200
                        file:mr-4 file:cursor-pointer file:rounded-full file:border-0
                        file:bg-slate-800 file:px-4 file:py-2
                        file:text-xs file:font-semibold
                        file:text-slate-50 hover:file:bg-slate-700"
                    />
                    <div className="flex flex-col gap-1 text-[11px] text-slate-400">
                      <span>
                        حداقل ستون‌های لازم: «نام کالا»، «کد انبار کالا» و «تعداد». اگر اسم‌ها
                        کمی متفاوت باشند (مثلاً فاصله، نیم‌فاصله یا معادل انگلیسی)، سیستم سعی
                        می‌کند خودش آن‌ها را تشخیص دهد.
                      </span>
                      {excelFile && (
                        <span className="truncate text-[11px] text-sky-300">
                          فایل انتخاب‌شده: {excelFile.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {status === 'parsing' && 'در حال خواندن Excel...'}
                    {status === 'generating' && 'در حال ساخت PDF لیبل‌ها...'}
                    {(status === 'idle' || status === 'success' || status === 'error') &&
                      'تولید لیبل‌ها'}
                  </button>

                  {status === 'success' && pdfUrl && (
                    <a
                      href={pdfUrl}
                      download="labels-output.pdf"
                      className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-xs font-medium text-slate-100 shadow-sm hover:border-slate-400 hover:bg-slate-800"
                    >
                      دانلود PDF لیبل‌ها
                    </a>
                  )}
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-[11px] text-red-200">
                    {error}
                  </div>
                )}

                {(status === 'parsing' || status === 'generating') && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span className="inline-flex h-4 w-4 items-center justify-center">
                      <span className="h-3 w-3 animate-spin rounded-full border-[2px] border-slate-400 border-t-transparent" />
                    </span>
                    در حال پردازش فایل... لطفاً صفحه را نبندید.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Right side: info / steps */}
          <aside className="w-full md:w-2/5">
            <div className="flex h-full flex-col gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-100">
                  ۲. منطق تولید PDF (خلاصه)
                </h3>
                <ul className="space-y-2 text-[11px] leading-relaxed text-slate-300">
                  <li>• برای هر ردیف Excel، مقدار «تعداد» مشخص می‌کند چند لیبل ساخته شود.</li>
                  <li>• هر لیبل شامل بارکد CODE128، کد کالا و نام کالا است.</li>
                  <li>• PDF با اندازه ۵۶۵ × ۱۴۱ پوینت و دو لیبل در هر صفحه (کنار هم) ساخته می‌شود.</li>
                  <li>• اگر تعداد لیبل‌ها فرد باشد، آخرین لیبل تنها در سمت چپ صفحه‌ی آخر قرار می‌گیرد.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-[11px] text-slate-300">
                <h3 className="mb-3 text-sm font-semibold text-slate-100">
                  ۳. نکات عملیاتی
                </h3>
                <ul className="space-y-2 leading-relaxed">
                  <li>• خروجی PDF را روی لیبل‌پرینتر دو ستونه فعلی تست کن (Landscape).</li>
                  <li>• مطمئن شو scaling چاپگر روی ۱۰۰٪ یا “Actual Size” باشد.</li>
                  <li>• تمام پردازش روی مرورگر انجام می‌شود؛ هیچ داده‌ای از محیط انبار خارج نمی‌شود.</li>
                </ul>
              </div>
            </div>
          </aside>
        </main>

        <footer className="mt-6 border-t border-slate-800 pt-3">
          <p className="text-[10px] text-slate-500">
            ساخته شده برای فرآیندهای Fulfillment ایفا – قابل استقرار روی Cloudflare Pages و
            اتصال به دامنه{' '}
            <span className="font-mono text-sky-300">nexalabdev.app</span>.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
