import { Home, ReceiptText, PieChart, Settings } from 'lucide-react';

export default function BottomNav({ activeTab, onChange }) {
  const tabs = [
    { id: 'home', label: 'Beranda', icon: Home },
    { id: 'transactions', label: 'Transaksi', icon: ReceiptText },
    { id: 'analytics', label: 'Analistik', icon: PieChart },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200/60 pb-safe shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)]">
      <div className="max-w-md mx-auto flex justify-between items-center px-6 py-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex flex-col items-center justify-center w-16 pt-2 pb-1 transition-colors"
              aria-label={tab.label}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-blue-100/80 text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] mt-1 font-medium transition-all duration-300 ${isActive ? 'text-blue-700' : 'text-slate-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
