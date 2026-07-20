import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Target, Flame, Plus, ChevronRight, X, Loader2, Sparkles, TrendingUp, PiggyBank } from 'lucide-react';
import { createPortal } from 'react-dom';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

export default function SavingsView({ user, apiBaseUrl }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formIcon, setFormIcon] = useState('🎯');
  const [depositAmount, setDepositAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiBaseUrl}/savings?userId=${user.id}`);
      setGoals(res.data.data);
    } catch (err) {
      console.error('Failed to fetch savings:', err);
    } finally {
      setLoading(false);
    }
  }, [user.id, apiBaseUrl]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Derived state calculations
  const { totalSavings, hasSavedToday, streakCount } = useMemo(() => {
    let total = 0;
    const uniqueDates = new Set();
    const todayStr = new Date().toISOString().split('T')[0];
    
    let savedToday = false;

    goals.forEach(goal => {
      total += goal.currentAmount;
      goal.logs.forEach(log => {
        const dateStr = new Date(log.createdAt).toISOString().split('T')[0];
        uniqueDates.add(dateStr);
        if (dateStr === todayStr) {
          savedToday = true;
        }
      });
    });

    const sortedDates = Array.from(uniqueDates).sort((a, b) => b.localeCompare(a));
    
    let currentStreak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    // If hasn't saved today, the streak check should start from yesterday
    if (!savedToday && sortedDates.length > 0) {
      const mostRecent = new Date(sortedDates[0]);
      mostRecent.setHours(0,0,0,0);
      const diffTime = Math.abs(checkDate - mostRecent);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        // Streak broken
        return { totalSavings: total, hasSavedToday: savedToday, streakCount: 0 };
      } else {
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    for (const dStr of sortedDates) {
      const d = new Date(dStr);
      d.setHours(0, 0, 0, 0);
      
      if (d.getTime() === checkDate.getTime()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { 
      totalSavings: total, 
      hasSavedToday: savedToday, 
      streakCount: currentStreak 
    };
  }, [goals]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!formTitle || !formAmount) return;
    
    try {
      setSubmitting(true);
      await axios.post(`${apiBaseUrl}/savings`, {
        userId: user.id,
        title: formTitle,
        targetAmount: parseFloat(formAmount),
        icon: formIcon
      });
      setShowGoalModal(false);
      setFormTitle('');
      setFormAmount('');
      setFormIcon('🎯');
      await fetchGoals();
    } catch (err) {
      console.error(err);
      alert('Gagal membuat target.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || !selectedGoal) return;

    try {
      setSubmitting(true);
      await axios.post(`${apiBaseUrl}/savings/${selectedGoal.id}/deposit`, {
        amount: parseFloat(depositAmount)
      });
      setShowDepositModal(false);
      setDepositAmount('');
      setSelectedGoal(null);
      await fetchGoals();
    } catch (err) {
      console.error(err);
      alert('Gagal memproses setoran.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeposit = (goal) => {
    setSelectedGoal(goal);
    setShowDepositModal(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Daily Banner */}
      {!hasSavedToday && !loading && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl shrink-0">
              <Sparkles className="w-6 h-6 text-orange-100" />
            </div>
            <div>
              <h3 className="font-bold">Kamu belum nabung hari ini!</h3>
              <p className="text-orange-50 text-sm">Yuk sisihkan uang jajanmu biar target cepat tercapai.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <PiggyBank className="w-24 h-24" />
          </div>
          <p className="text-blue-100 text-sm font-medium mb-1">Total Tabungan</p>
          <h2 className="text-3xl font-extrabold mb-1 tracking-tight">
            {formatCurrency(totalSavings)}
          </h2>
        </div>

        <div className="glass-card p-5 flex items-center gap-4 border-orange-200/50 bg-gradient-to-br from-white to-orange-50">
          <div className="w-14 h-14 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-orange-200">
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Daily Streak</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-extrabold text-slate-800">{streakCount}</span>
              <span className="text-slate-500 font-medium mb-1">Hari beruntun</span>
            </div>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" /> Target Impian
          </h3>
          <button 
            onClick={() => setShowGoalModal(true)}
            className="flex items-center gap-1 text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Plus className="w-4 h-4" /> Baru
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400 animate-pulse">Memuat target...</div>
        ) : goals.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-12 text-center bg-slate-50/50">
            <Target className="w-12 h-12 text-slate-300 mb-3" />
            <p className="font-bold text-slate-700">Belum ada target menabung</p>
            <p className="text-sm text-slate-500 mb-4">Buat target pertamamu sekarang!</p>
            <button 
              onClick={() => setShowGoalModal(true)}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-indigo-700 transition-colors"
            >
              Mulai Menabung
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(goal => {
              const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              const isCompleted = goal.currentAmount >= goal.targetAmount;
              
              return (
                <div key={goal.id} className={`glass-card p-5 relative overflow-hidden transition-all ${isCompleted ? 'border-emerald-200 bg-emerald-50/30' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl bg-slate-100 w-12 h-12 flex items-center justify-center rounded-2xl shadow-sm border border-slate-200">
                        {goal.icon || '🎯'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{goal.title}</h4>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                          Terkumpul {formatCurrency(goal.currentAmount)}
                        </p>
                      </div>
                    </div>
                    {isCompleted && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">
                        Tercapai
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className={isCompleted ? 'text-emerald-600' : 'text-indigo-600'}>{percentage}%</span>
                      <span className="text-slate-400">Target: {formatCurrency(goal.targetAmount)}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-blue-500'}`} 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {!isCompleted && (
                    <button 
                      onClick={() => openDeposit(goal)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors text-sm"
                    >
                      <TrendingUp className="w-4 h-4" /> Setor Sekarang
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Goal Modal */}
      {showGoalModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg text-slate-800">Target Impian Baru</h3>
              <button onClick={() => setShowGoalModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ikon / Emoji</label>
                <div className="flex gap-2 mb-2">
                  {['🎯','📱','🏍️','🚗','🏖️','🏠','💻','💍'].map(emoji => (
                    <button 
                      type="button"
                      key={emoji} 
                      onClick={() => setFormIcon(emoji)}
                      className={`w-10 h-10 text-xl flex items-center justify-center rounded-xl border ${formIcon === emoji ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <input type="text" value={formIcon} onChange={e => setFormIcon(e.target.value)} className="glass-input w-20 text-center" placeholder="Atau ketik.." />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Judul Target</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} required placeholder="Contoh: Beli Laptop Baru" className="glass-input w-full" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nominal Target (Rp)</label>
                <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} required placeholder="Contoh: 15000000" min="1" className="glass-input w-full" />
              </div>

              <button type="submit" disabled={submitting} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl mt-4 flex items-center justify-center disabled:opacity-50">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan Target'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Deposit Modal */}
      {showDepositModal && selectedGoal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg text-slate-800">Setor ke {selectedGoal.icon}</h3>
              <button onClick={() => { setShowDepositModal(false); setSelectedGoal(null); }} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 mb-4 font-medium">
              Target: <span className="font-bold text-slate-700">{selectedGoal.title}</span><br/>
              Kekurangan: {formatCurrency(selectedGoal.targetAmount - selectedGoal.currentAmount)}
            </p>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nominal Setoran (Rp)</label>
                <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} required placeholder="Contoh: 50000" min="1" max={selectedGoal.targetAmount - selectedGoal.currentAmount} className="glass-input w-full text-lg font-bold" />
              </div>

              <button type="submit" disabled={submitting} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl mt-4 flex items-center justify-center disabled:opacity-50">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Setor Tabungan'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
