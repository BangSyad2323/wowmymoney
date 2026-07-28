import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import {
  Users, ArrowUpCircle, ArrowDownCircle, Plus, X, Loader2,
  CheckCircle2, Clock, Trash2, AlertTriangle, BadgeCheck, CalendarClock
} from 'lucide-react';

const formatCurrency = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const formatDate = (d) =>
  d ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d)) : null;

const isOverdue = (dueDate, status) =>
  status === 'UNPAID' && dueDate && new Date(dueDate) < new Date();

export default function DebtView({ user, apiBaseUrl, onMetricsChanged }) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL | RECEIVABLE | PAYABLE

  // Modals
  const [showAddModal, setShowAddModal] = useState(null); // null | 'RECEIVABLE' | 'PAYABLE'
  const [showPayModal, setShowPayModal] = useState(null); // debt object or null
  const [showDeleteModal, setShowDeleteModal] = useState(null); // debt object or null
  const [submitting, setSubmitting] = useState(false);

  // Partial Payment State
  const [paymentMode, setPaymentMode] = useState('FULL'); // FULL | PARTIAL
  const [partialAmount, setPartialAmount] = useState('');

  // Form
  const [formPerson, setFormPerson] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDue, setFormDue] = useState('');
  const [formNote, setFormNote] = useState('');

  const fetchDebts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiBaseUrl}/debts?userId=${user.id}`);
      setDebts(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, user.id]);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);

  // Summary totals
  const { totalReceivable, totalPayable, unpaidReceivable, unpaidPayable } = useMemo(() => {
    let tR = 0, tP = 0, uR = 0, uP = 0;
    debts.forEach(d => {
      const remaining = d.amount - (d.paidAmount || 0);
      if (d.type === 'RECEIVABLE') {
        tR += d.amount;
        if (d.status === 'UNPAID') uR += remaining;
      } else {
        tP += d.amount;
        if (d.status === 'UNPAID') uP += remaining;
      }
    });
    return { totalReceivable: tR, totalPayable: tP, unpaidReceivable: uR, unpaidPayable: uP };
  }, [debts]);

  const filtered = useMemo(() =>
    activeFilter === 'ALL' ? debts : debts.filter(d => d.type === activeFilter),
    [debts, activeFilter]
  );

  const resetForm = () => {
    setFormPerson(''); setFormAmount(''); setFormDue(''); setFormNote('');
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formPerson || !formAmount) return;
    try {
      setSubmitting(true);
      await axios.post(`${apiBaseUrl}/debts`, {
        userId: user.id,
        personName: formPerson,
        amount: parseFloat(formAmount),
        type: showAddModal,
        dueDate: formDue || null,
        note: formNote || null
      });
      setShowAddModal(null);
      resetForm();
      await fetchDebts();
      onMetricsChanged?.();
    } catch (e) {
      alert('Gagal menyimpan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const openPayModal = (debt) => {
    setShowPayModal(debt);
    setPaymentMode('FULL');
    setPartialAmount('');
  };

  const handlePay = async () => {
    if (!showPayModal) return;
    try {
      setSubmitting(true);
      if (paymentMode === 'FULL') {
        await axios.post(`${apiBaseUrl}/debts/${showPayModal.id}/pay`, { userId: user.id });
      } else {
        const amt = parseFloat(partialAmount);
        if (!amt || amt <= 0) {
          alert('Masukkan nominal cicilan yang valid.');
          return;
        }
        const remaining = showPayModal.amount - (showPayModal.paidAmount || 0);
        if (amt > remaining) {
          alert('Nominal cicilan tidak boleh melebihi sisa utang/piutang.');
          return;
        }
        await axios.post(`${apiBaseUrl}/debts/${showPayModal.id}/partial-pay`, {
          userId: user.id,
          amount: amt
        });
      }
      setShowPayModal(null);
      await fetchDebts();
      onMetricsChanged?.();
    } catch (e) {
      alert(e.response?.data?.error || 'Gagal memproses pembayaran.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    try {
      setSubmitting(true);
      await axios.delete(`${apiBaseUrl}/debts/${showDeleteModal.id}`);
      setShowDeleteModal(null);
      await fetchDebts();
      onMetricsChanged?.();
    } catch (e) {
      alert('Gagal menghapus.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div
          onClick={() => setActiveFilter(activeFilter === 'RECEIVABLE' ? 'ALL' : 'RECEIVABLE')}
          className={`glass-card p-4 cursor-pointer transition-all select-none ${activeFilter === 'RECEIVABLE' ? 'ring-2 ring-emerald-400 bg-emerald-50/60' : 'hover:bg-emerald-50/30'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
              <ArrowUpCircle className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Piutang</span>
          </div>
          <p className="text-lg font-extrabold text-emerald-700">{formatCurrency(unpaidReceivable)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Belum diterima</p>
        </div>

        <div
          onClick={() => setActiveFilter(activeFilter === 'PAYABLE' ? 'ALL' : 'PAYABLE')}
          className={`glass-card p-4 cursor-pointer transition-all select-none ${activeFilter === 'PAYABLE' ? 'ring-2 ring-rose-400 bg-rose-50/60' : 'hover:bg-rose-50/30'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
              <ArrowDownCircle className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utang</span>
          </div>
          <p className="text-lg font-extrabold text-rose-700">{formatCurrency(unpaidPayable)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Belum dibayar</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => { resetForm(); setShowAddModal('RECEIVABLE'); }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Catat Piutang
        </button>
        <button
          onClick={() => { resetForm(); setShowAddModal('PAYABLE'); }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Catat Utang
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex bg-slate-100/80 p-1 rounded-xl">
        {[['ALL', 'Semua'], ['RECEIVABLE', 'Piutang'], ['PAYABLE', 'Utang']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setActiveFilter(val)}
            className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${activeFilter === val ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Debt List */}
      {loading ? (
        <div className="text-center py-10 text-slate-400 animate-pulse">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center bg-slate-50/50 rounded-xl border border-slate-100">
          <Users className="w-10 h-10 mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">Tidak ada catatan {activeFilter === 'RECEIVABLE' ? 'piutang' : activeFilter === 'PAYABLE' ? 'utang' : 'utang/piutang'}.</p>
          <p className="text-sm mt-1">Gunakan tombol di atas untuk mulai mencatat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(debt => {
            const overdue = isOverdue(debt.dueDate, debt.status);
            return (
              <div
                key={debt.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${debt.status === 'PAID' ? 'opacity-60 border-slate-100' : overdue ? 'border-orange-200 bg-orange-50/30' : 'border-slate-200'}`}
              >
                <div className="p-4 flex gap-3 items-start">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-xl shrink-0 ${debt.type === 'RECEIVABLE' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {debt.type === 'RECEIVABLE' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 truncate">{debt.personName}</span>
                      {debt.status === 'PAID' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md uppercase"><BadgeCheck className="w-3 h-3" />Lunas</span>
                      ) : overdue ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-md uppercase"><AlertTriangle className="w-3 h-3" />Jatuh Tempo</span>
                      ) : null}
                    </div>
                    <div className="flex flex-col">
                      <p className={`text-base font-extrabold mt-0.5 ${debt.type === 'RECEIVABLE' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(debt.amount - (debt.paidAmount || 0))}
                      </p>
                      {debt.paidAmount > 0 && debt.status !== 'PAID' && (
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Dicicil: {formatCurrency(debt.paidAmount)} / {formatCurrency(debt.amount)}
                        </span>
                      )}
                    </div>
                    {debt.note && <p className="text-xs text-slate-500 mt-0.5 truncate">{debt.note}</p>}
                    {debt.dueDate && (
                      <p className={`flex items-center gap-1 text-xs mt-1 font-medium ${overdue ? 'text-orange-600' : 'text-slate-400'}`}>
                        <CalendarClock className="w-3 h-3" /> Jatuh tempo: {formatDate(debt.dueDate)}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-300 mt-1">Dicatat: {formatDate(debt.createdAt)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {debt.status === 'UNPAID' && (
                      <button
                        onClick={() => openPayModal(debt)}
                        className="flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Bayar/Cicil
                      </button>
                    )}
                    <button
                      onClick={() => setShowDeleteModal(debt)}
                      className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className={`font-bold text-lg flex items-center gap-2 ${showAddModal === 'RECEIVABLE' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {showAddModal === 'RECEIVABLE' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                {showAddModal === 'RECEIVABLE' ? 'Catat Piutang' : 'Catat Utang'}
              </h3>
              <button onClick={() => setShowAddModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-lg">
              {showAddModal === 'RECEIVABLE'
                ? '💡 Piutang = Kamu meminjamkan uang ke orang lain. Saldo utama kamu akan berkurang.'
                : '💡 Utang = Kamu menerima pinjaman dari orang lain. Saldo utama kamu akan bertambah.'}
            </p>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Orang</label>
                <input type="text" value={formPerson} onChange={e => setFormPerson(e.target.value)} required placeholder="Cth: Budi, Sari..." className="glass-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nominal (Rp)</label>
                <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} required min="1" placeholder="Cth: 150000" className="glass-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Jatuh Tempo <span className="text-slate-400 normal-case font-normal">(opsional)</span></label>
                <input type="date" value={formDue} onChange={e => setFormDue(e.target.value)} className="glass-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Catatan <span className="text-slate-400 normal-case font-normal">(opsional)</span></label>
                <input type="text" value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Cth: Untuk bayar kost" className="glass-input w-full" />
              </div>
              <button type="submit" disabled={submitting} className={`w-full py-3 text-white font-bold rounded-xl mt-2 flex items-center justify-center disabled:opacity-50 transition-colors ${showAddModal === 'RECEIVABLE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan Catatan'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Pay Confirmation & Cicilan Modal */}
      {showPayModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-blue-500" /> Bayar Utang / Piutang</h3>
              <button onClick={() => setShowPayModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {/* Selector tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setPaymentMode('FULL')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${paymentMode === 'FULL' ? 'bg-white text-blue-600 shadow-sm font-extrabold' : 'text-slate-500'}`}
              >
                Pelunasan Penuh
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMode('PARTIAL'); setPartialAmount(''); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${paymentMode === 'PARTIAL' ? 'bg-white text-blue-600 shadow-sm font-extrabold' : 'text-slate-500'}`}
              >
                Cicilan
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Orang</span><span className="font-bold">{showPayModal.personName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tipe</span><span className="font-bold">{showPayModal.type === 'RECEIVABLE' ? '🟢 Piutang (Uang Kamu di Orang)' : '🔴 Utang (Utang Kamu ke Orang)'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Awal</span><span className="font-bold">{formatCurrency(showPayModal.amount)}</span></div>
              <div className="flex justify-between text-slate-600"><span className="text-slate-500">Sudah Dicicil</span><span className="font-semibold">{formatCurrency(showPayModal.paidAmount || 0)}</span></div>
              <div className="flex justify-between border-t border-slate-200/60 pt-1.5 font-bold"><span className="text-slate-800">Sisa Tagihan</span><span className="text-blue-600">{formatCurrency(showPayModal.amount - (showPayModal.paidAmount || 0))}</span></div>
            </div>

            {paymentMode === 'PARTIAL' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nominal Cicilan (Rp)</label>
                <input
                  type="number"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  max={showPayModal.amount - (showPayModal.paidAmount || 0)}
                  min="1"
                  required
                  placeholder="Cth: 50000"
                  className="glass-input w-full font-bold text-slate-800 focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Maksimal cicilan: {formatCurrency(showPayModal.amount - (showPayModal.paidAmount || 0))}
                </span>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowPayModal(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm">Batal</button>
              <button onClick={handlePay} disabled={submitting} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors text-sm">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (paymentMode === 'FULL' ? 'Lunasi Sekarang' : 'Bayar Cicilan')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Trash2 className="w-5 h-5 text-rose-500" /> Hapus Catatan</h3>
              <button onClick={() => setShowDeleteModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Hapus catatan <strong>{showDeleteModal.type === 'RECEIVABLE' ? 'piutang' : 'utang'}</strong> kepada <strong>{showDeleteModal.personName}</strong> sebesar <strong>{formatCurrency(showDeleteModal.amount)}</strong>?
              <br /><span className="text-xs text-slate-400 mt-1 block">Catatan ini hanya akan dihapus dari daftar. Transaksi saldo yang sudah dibuat tidak akan dibatalkan.</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Batal</button>
              <button onClick={handleDelete} disabled={submitting} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Hapus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
