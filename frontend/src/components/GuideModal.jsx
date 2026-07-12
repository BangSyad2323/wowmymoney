import { useState, useEffect } from 'react';
import { X, Lightbulb, Loader2 } from 'lucide-react';

const examples = [
  { text: 'beli kuota 50.000', result: 'Pengeluaran • Kuota • Rp50.000' },
  { text: 'bayar kosan 1.000.000', result: 'Pengeluaran • Kosan • Rp1.000.000' },
  { text: 'dapat bonus 200.000', result: 'Pemasukan • Bonus • Rp200.000' },
  { text: 'gaji bulan ini 3000000', result: 'Pemasukan • Bulan • Rp3.000.000' },
  { text: 'jajan bakso 15000', result: 'Pengeluaran • Bakso • Rp15.000' },
];

export default function GuideModal({ apiBaseUrl, onClose }) {
  const [keywords, setKeywords] = useState({ income: [], expense: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        const res = await fetch(`${apiBaseUrl.replace('/api/transactions', '')}/api/keywords`);
        const json = await res.json();
        const income = json.data.filter(k => k.type === 'INCOME').map(k => k.keyword);
        const expense = json.data.filter(k => k.type === 'EXPENSE').map(k => k.keyword);
        setKeywords({ income, expense });
      } catch {
        setKeywords({
          income: ['dapat', 'gaji', 'nemu', 'dikasih', 'bonus'],
          expense: ['beli', 'bayar', 'utang', 'jajan', 'ongkos']
        });
      } finally {
        setLoading(false);
      }
    };
    fetchKeywords();
  }, [apiBaseUrl]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h2 id="guide-modal-title" className="text-lg font-bold text-slate-800">
              Panduan Cara Penggunaan
            </h2>
          </div>
          <button
            onClick={onClose}
            id="guide-modal-close"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Tutup panduan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-slate-500">
            Ketik kalimat biasa di kolom input — sistem akan otomatis mendeteksi tipe transaksi, kategori, dan nominalnya.
          </p>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">✅ Kata Pemasukan</p>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.income.map(kw => (
                    <span key={kw} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-xs font-mono">
                      {kw}
                    </span>
                  ))}
                  {keywords.income.length === 0 && <span className="text-xs text-slate-400">Belum ada</span>}
                </div>
              </div>
              <div className="bg-rose-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2">💸 Kata Pengeluaran</p>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.expense.map(kw => (
                    <span key={kw} className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-xs font-mono">
                      {kw}
                    </span>
                  ))}
                  {keywords.expense.length === 0 && <span className="text-xs text-slate-400">Belum ada</span>}
                </div>
              </div>
            </div>
          )}

          {/* Examples */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contoh Kalimat</p>
            <div className="space-y-2">
              {examples.map((ex, i) => (
                <div key={i} className="bg-slate-50 rounded-lg px-4 py-3">
                  <p className="font-mono text-sm text-slate-800">"{ex.text}"</p>
                  <p className="text-xs text-slate-400 mt-0.5">→ {ex.result}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
            <strong>💡 Tips:</strong> Kata benda setelah kata aksi (beli, bayar, dst.) akan otomatis menjadi nama <strong>kategori</strong>. Tambah kata kunci baru di menu <strong>Kelola Kata Kunci</strong>.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            id="guide-modal-close-btn"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Mengerti, Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
