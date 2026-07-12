import { Trash2, ChevronDown, Loader2 } from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export default function TransactionHistory({ transactions, onDelete, hasMore, onLoadMore, loadingMore }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="glass-card h-full flex flex-col items-center justify-center min-h-[300px] text-slate-400">
        <p>Belum ada transaksi.</p>
      </div>
    );
  }

  return (
    <div className="glass-card h-full flex flex-col">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Riwayat Transaksi</h3>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200/60 text-slate-500">
              <th className="pb-3 font-medium px-2">Tanggal</th>
              <th className="pb-3 font-medium px-2">Deskripsi</th>
              <th className="pb-3 font-medium px-2">Kategori</th>
              <th className="pb-3 font-medium px-2 text-right">Nominal</th>
              <th className="pb-3 font-medium px-2 text-center w-12">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="py-3 px-2 text-slate-500 text-xs sm:text-sm">
                  {formatDate(tx.created_at)}
                </td>
                <td className="py-3 px-2 font-medium text-slate-800 max-w-[120px] sm:max-w-xs truncate">
                  {tx.description}
                </td>
                <td className="py-3 px-2">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                    {tx.category}
                  </span>
                </td>
                <td className={`py-3 px-2 text-right font-bold ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                </td>
                <td className="py-3 px-2 text-center">
                  <button 
                    onClick={() => onDelete(tx.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    aria-label="Hapus transaksi"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="pt-4 flex justify-center border-t border-slate-100/50 mt-4">
          <button
            id="load-more-btn"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memuat...
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Muat Lebih Banyak
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
