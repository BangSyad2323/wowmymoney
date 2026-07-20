import { Tag, HelpCircle, User, ShieldCheck, LogOut } from 'lucide-react';

export default function SettingsView({ user, onLogout, onToggleKeywords, onOpenGuide }) {
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
        </div>
      </div>
      
      <div className="text-center pb-8 pt-4">
        <p className="text-xs text-slate-400 font-medium">WowMyMoney MVP v1.0.0</p>
      </div>
    </div>
  );
}
