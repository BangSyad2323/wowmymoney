import { useState, useMemo, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Calendar, Clock, Info, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { createPortal } from 'react-dom';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

const formatTime = (dateString) => {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
};

export default function SavingsHistory({ user, apiBaseUrl, refreshKey, onLogDeleted }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTabId, setSelectedTabId] = useState(null);
  const [deleteConfirmLog, setDeleteConfirmLog] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async (log) => {
    try {
      setDeleting(true);
      await axios.delete(`${apiBaseUrl}/savings/logs/${log.id}`);
      setDeleteConfirmLog(null);
      onLogDeleted?.();
    } catch (err) {
      alert('Gagal menghapus transaksi tabungan.');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${apiBaseUrl}/savings/logs?userId=${user.id}&_t=${Date.now()}`);
        setLogs(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  // refreshKey intentionally triggers re-fetch when parent mutates data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, user.id, refreshKey]);

  // Generate Month Tabs
  const tabs = useMemo(() => {
    const generatedTabs = [];
    const now = new Date();
    
    if (!logs || logs.length === 0) {
      const monthYear = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(now);
      return [{ id: `${now.getFullYear()}-${now.getMonth()}`, label: monthYear, year: now.getFullYear(), month: now.getMonth() }];
    }

    const oldestDate = new Date(logs[logs.length - 1].createdAt);
    let currentYear = oldestDate.getFullYear();
    let currentMonth = oldestDate.getMonth();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth();

    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const d = new Date(currentYear, currentMonth, 1);
      const label = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(d);
      generatedTabs.push({ id: `${currentYear}-${currentMonth}`, label, year: currentYear, month: currentMonth });
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    }
    return generatedTabs.reverse();
  }, [logs]);

  useEffect(() => {
    if (tabs.length > 0 && !selectedTabId) setSelectedTabId(tabs[0].id);
  }, [tabs, selectedTabId]);

  // Filter and group by Date
  const filteredAndGrouped = useMemo(() => {
    if (!logs || !selectedTabId) return [];

    const selectedTab = tabs.find(t => t.id === selectedTabId);
    if (!selectedTab) return [];

    const filtered = logs.filter(log => {
      const d = new Date(log.createdAt);
      return d.getMonth() === selectedTab.month && d.getFullYear() === selectedTab.year;
    });

    const groupedObj = filtered.reduce((acc, curr) => {
      const date = new Date(curr.createdAt);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          dateKey,
          readableDate: new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(date),
          logs: [],
          dailyDeposit: 0,
          dailyWithdraw: 0
        };
      }
      acc[dateKey].logs.push(curr);
      if (curr.type === 'DEPOSIT') acc[dateKey].dailyDeposit += curr.amount;
      else acc[dateKey].dailyWithdraw += curr.amount;
      
      return acc;
    }, {});

    return Object.values(groupedObj).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [logs, selectedTabId, tabs]);

  if (loading) return <div className="text-center py-10 text-slate-400 animate-pulse">Memuat riwayat...</div>;

  return (
    <div className="space-y-6">
      {/* Dynamic Tabs */}
      <div className="flex p-1 bg-slate-100/80 rounded-xl overflow-x-auto no-scrollbar snap-x">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTabId(tab.id)}
            className={`flex-1 min-w-[100px] text-sm font-semibold py-2 px-4 rounded-lg transition-all whitespace-nowrap snap-center ${
              selectedTabId === tab.id 
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-6">
        {filteredAndGrouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center bg-slate-50/50 rounded-xl border border-slate-100/50">
            <Info className="w-10 h-10 mb-3 text-slate-300" />
            <p className="font-medium text-slate-500">Belum ada riwayat tabungan bulan ini.</p>
          </div>
        ) : (
          filteredAndGrouped.map(group => (
            <div key={group.dateKey} className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 flex justify-between items-center border-b border-slate-100">
                <span className="text-sm font-bold text-slate-700">{group.readableDate}</span>
                <div className="flex gap-3 text-xs font-semibold">
                  {group.dailyDeposit > 0 && <span className="text-emerald-600">+{formatCurrency(group.dailyDeposit)}</span>}
                  {group.dailyWithdraw > 0 && <span className="text-rose-600">-{formatCurrency(group.dailyWithdraw)}</span>}
                </div>
              </div>

              <div className="divide-y divide-slate-50">
                {group.logs.map(log => (
                  <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start sm:items-center gap-3 overflow-hidden flex-1">
                      <div className={`p-2 rounded-lg shrink-0 ${log.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {log.type === 'DEPOSIT' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate flex items-center gap-1">
                          {log.savingsGoal.icon} {log.type === 'DEPOSIT' ? 'Setor Tabungan' : 'Tarik Tabungan'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium text-slate-500 inline-block px-2 py-0.5 bg-slate-100 rounded-md truncate max-w-[150px]">
                            {log.savingsGoal.title}
                          </span>
                          <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatTime(log.createdAt)}
                          </span>
                        </div>
                        {log.reason && (
                          <p className="text-xs text-rose-500 mt-1 italic">Alasan: {log.reason}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 shrink-0 pl-11 sm:pl-0">
                      <span className={`font-bold whitespace-nowrap text-sm sm:text-base ${log.type === 'DEPOSIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {log.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(log.amount)}
                      </span>
                      <button 
                        onClick={() => setDeleteConfirmLog(log)}
                        disabled={deleting}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/50 shrink-0"
                        aria-label="Hapus transaksi tabungan"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmLog && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-800">Hapus Transaksi?</h4>
            </div>
            <p className="text-slate-600 text-sm mb-6">
              Apakah Anda yakin ingin menghapus transaksi tabungan sebesar <strong>{formatCurrency(deleteConfirmLog.amount)}</strong> untuk target <strong>"{deleteConfirmLog.savingsGoal.title}"</strong>?
              <br/><br/>
              Ini akan menyesuaikan kembali saldo tabungan dan saldo utama/dompet Anda secara otomatis.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setDeleteConfirmLog(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
              >
                Batal
              </button>
              <button 
                onClick={() => confirmDelete(deleteConfirmLog)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20 rounded-lg transition-colors focus:outline-none flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
