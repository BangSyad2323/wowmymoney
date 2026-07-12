import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

export default function DashboardCards({ balance, income, expense }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div className="glass-card flex items-center space-x-4 bg-gradient-to-br from-white/60 to-blue-50/40">
        <div className="p-3 bg-blue-100/80 text-blue-600 rounded-full">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Saldo Saat Ini</p>
          <p className="text-xl font-bold text-slate-800">{formatCurrency(balance)}</p>
        </div>
      </div>
      
      <div className="glass-card flex items-center space-x-4 bg-gradient-to-br from-white/60 to-emerald-50/40">
        <div className="p-3 bg-emerald-100/80 text-emerald-600 rounded-full">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Total Pemasukan</p>
          <p className="text-xl font-bold text-emerald-700">{formatCurrency(income)}</p>
        </div>
      </div>
      
      <div className="glass-card flex items-center space-x-4 bg-gradient-to-br from-white/60 to-rose-50/40">
        <div className="p-3 bg-rose-100/80 text-rose-600 rounded-full">
          <TrendingDown className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Total Pengeluaran</p>
          <p className="text-xl font-bold text-rose-700">{formatCurrency(expense)}</p>
        </div>
      </div>
    </div>
  );
}
