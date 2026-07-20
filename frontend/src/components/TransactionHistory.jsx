import { useState, useMemo } from 'react';
import { Trash2, ChevronDown, Loader2, AlertCircle, ArrowUpCircle, ArrowDownCircle, Info, Calendar } from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

export default function TransactionHistory({ transactions, onDelete, hasMore, onLoadMore, loadingMore }) {
  const [selectedTab, setSelectedTab] = useState('current'); // 'past', 'current', 'future'
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  // Categorize and filter transactions based on month
  const filteredAndGrouped = useMemo(() => {
    if (!transactions) return { groups: [], summary: { income: 0, expense: 0, total: 0 } };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Filter by selected tab
    const filtered = transactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      const txMonth = txDate.getMonth();
      const txYear = txDate.getFullYear();

      if (selectedTab === 'current') {
        return txMonth === currentMonth && txYear === currentYear;
      } else if (selectedTab === 'past') {
        return txYear < currentYear || (txYear === currentYear && txMonth < currentMonth);
      } else {
        return txYear > currentYear || (txYear === currentYear && txMonth > currentMonth);
      }
    });

    // 2. Calculate summary for the selected period
    const summary = filtered.reduce((acc, curr) => {
      if (curr.type === 'INCOME') {
        acc.income += curr.amount;
        acc.total += curr.amount;
      } else {
        acc.expense += curr.amount;
        acc.total -= curr.amount;
      }
      return acc;
    }, { income: 0, expense: 0, total: 0 });

    // 3. Group by Date
    const groupedObj = filtered.reduce((acc, curr) => {
      const date = new Date(curr.created_at);
      // Format: YYYY-MM-DD for sorting
      const dateKey = date.toISOString().split('T')[0];
      
      if (!acc[dateKey]) {
        // Build readable date string e.g. "Selasa, 12 Juli 2026"
        const readableDate = new Intl.DateTimeFormat('id-ID', {
          weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        }).format(date);

        acc[dateKey] = {
          dateKey,
          readableDate,
          transactions: [],
          dailyIncome: 0,
          dailyExpense: 0
        };
      }
      
      acc[dateKey].transactions.push(curr);
      if (curr.type === 'INCOME') acc[dateKey].dailyIncome += curr.amount;
      else acc[dateKey].dailyExpense += curr.amount;
      
      return acc;
    }, {});

    // 4. Convert to array and sort by date descending
    const groups = Object.values(groupedObj).sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    return { groups, summary };
  }, [transactions, selectedTab]);

  const { groups, summary } = filteredAndGrouped;

  const confirmDelete = (id) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="glass-card h-full flex flex-col w-full overflow-hidden p-4 sm:p-6">
      <h3 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-500" /> Riwayat Transaksi
      </h3>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100/80 rounded-xl mb-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'past', label: 'Bulan Lalu' },
          { id: 'current', label: 'Bulan Ini' },
          { id: 'future', label: 'Masa Depan' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`flex-1 min-w-[100px] text-sm font-semibold py-2 px-3 rounded-lg transition-all whitespace-nowrap ${
              selectedTab === tab.id 
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Period Summary */}
      <div className="grid grid-cols-3 gap-2 mb-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
        <div>
          <p className="text-xs text-slate-500 mb-1 font-medium">Pemasukan</p>
          <p className="text-sm sm:text-base font-bold text-emerald-600">{formatCurrency(summary.income)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1 font-medium">Pengeluaran</p>
          <p className="text-sm sm:text-base font-bold text-rose-600">{formatCurrency(summary.expense)}</p>
        </div>
        <div className="text-right border-l border-slate-200 pl-2">
          <p className="text-xs text-slate-500 mb-1 font-medium">Total Bersih</p>
          <p className={`text-sm sm:text-base font-bold ${summary.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {summary.total >= 0 ? '+' : ''}{formatCurrency(summary.total)}
          </p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-6">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-center">
            <Info className="w-10 h-10 mb-3 text-slate-300" />
            <p className="font-medium">Belum ada transaksi di periode ini.</p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.dateKey} className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
              {/* Group Header */}
              <div className="bg-slate-50 px-4 py-2.5 flex justify-between items-center border-b border-slate-100">
                <span className="text-xs sm:text-sm font-bold text-slate-700">{group.readableDate}</span>
                <div className="flex gap-3 text-xs font-semibold">
                  {group.dailyIncome > 0 && <span className="text-emerald-600">+{formatCurrency(group.dailyIncome)}</span>}
                  {group.dailyExpense > 0 && <span className="text-rose-600">-{formatCurrency(group.dailyExpense)}</span>}
                </div>
              </div>

              {/* Group Items */}
              <div className="divide-y divide-slate-50">
                {group.transactions.map(tx => (
                  <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                    
                    <div className="flex items-start sm:items-center gap-3 overflow-hidden">
                      <div className={`p-2 rounded-lg shrink-0 ${tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {tx.type === 'INCOME' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{tx.description}</p>
                        <p className="text-xs font-medium text-slate-500 mt-0.5 inline-block px-2 py-0.5 bg-slate-100 rounded-md">
                          {tx.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0 pl-11 sm:pl-0">
                      <span className={`font-bold whitespace-nowrap text-sm sm:text-base ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                      <button 
                        onClick={() => setDeleteConfirmId(tx.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/50 shrink-0"
                        aria-label="Hapus transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {hasMore && selectedTab === 'current' && (
        <div className="pt-5 pb-2 flex justify-center mt-auto">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed rounded-full transition-colors shadow-sm"
          >
            {loadingMore ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Memuat...</>
            ) : (
              <><ChevronDown className="w-4 h-4" /> Muat Lebih Banyak</>
            )}
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-800">Hapus Transaksi?</h4>
            </div>
            <p className="text-slate-600 text-sm mb-6">
              Apakah Anda yakin ingin menghapus transaksi ini? Data yang dihapus tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => confirmDelete(deleteConfirmId)}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20 rounded-lg transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
