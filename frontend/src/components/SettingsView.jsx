import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Tag, HelpCircle, User, ShieldCheck, LogOut, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';

export default function SettingsView({ user, onLogout, onToggleKeywords, onOpenGuide, onResetAll }) {
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleResetExecute = async () => {
    if (confirmText !== 'HAPUS') return;
    try {
      setResetting(true);
      await onResetAll();
      setShowResetModal(false);
      setConfirmText('');
    } catch (e) {
      console.error(e);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card flex items-center justify-between gap-4 bg-white/60">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center shrink-0 border border-blue-200/50">
            <User className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 capitalize">{user?.username || 'User Guest'}</h2>
            <p className="text-sm font-medium text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Akun Terverifikasi
            </p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="p-2.5 text-rose-500 bg-rose-50 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-colors shadow-sm"
          aria-label="Logout"
          title="Keluar / Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="glass-card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Aplikasi & Data</h3>
        </div>
        <div className="divide-y divide-slate-100">
          <button 
            onClick={onToggleKeywords}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="p-2.5 bg-violet-100 text-violet-600 rounded-xl">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Kelola Kata Kunci</p>
              <p className="text-xs text-slate-500 mt-0.5">Atur kata kunci otomatis untuk kategori transaksi</p>
            </div>
          </button>
          
          <button 
            onClick={onOpenGuide}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Panduan Penggunaan</p>
              <p className="text-xs text-slate-500 mt-0.5">Pelajari cara mencatat transaksi secepat chatting</p>
            </div>
          </button>

          <button 
            onClick={() => { setShowResetModal(true); setConfirmText(''); }}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-rose-50/30 transition-colors text-left"
          >
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-rose-600">Reset Semua Data</p>
              <p className="text-xs text-slate-500 mt-0.5">Hapus seluruh transaksi harian, utang-piutang, dan tabungan</p>
            </div>
          </button>
        </div>
      </div>
      
      <div className="text-center pb-8 pt-4">
        <p className="text-xs text-slate-400 font-medium">WowMyMoney MVP v1.0.0</p>
      </div>

      {/* Danger Reset Modal */}
      {showResetModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-rose-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" /> Hapus Semua Data
              </h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 mb-5">
              <p className="text-sm text-slate-600">
                Apakah Anda yakin ingin menghapus <strong>SELURUH</strong> data transaksi harian, tabungan, dan utang-piutang?
              </p>
              <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-lg">
                <p className="text-xs font-bold text-rose-700">Tindakan ini tidak dapat dibatalkan!</p>
              </div>
              <p className="text-xs text-slate-500">
                Untuk mengonfirmasi, ketik kata kunci <strong className="text-rose-600">HAPUS</strong> di bawah ini:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Ketik HAPUS di sini"
                className="glass-input w-full uppercase tracking-widest text-center font-bold text-rose-600 border-rose-200 focus:border-rose-500 focus:ring-rose-500"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowResetModal(false)} 
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
              >
                Batal
              </button>
              <button 
                onClick={handleResetExecute} 
                disabled={confirmText !== 'HAPUS' || resetting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors text-sm"
              >
                {resetting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

