import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, BarChart2, Loader2 } from 'lucide-react';

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const normalizeApiBase = (v) =>
  (!v ? 'http://localhost:3000' : v.replace(/\/api\/transactions\/?$/, '').replace(/\/api\/?$/, ''));
const API_BASE_URL = normalizeApiBase(VITE_API_URL);

// 20-color palettes — enough for virtually any number of categories
const EXPENSE_COLORS = [
  '#ef4444','#f97316','#f59e0b','#ec4899','#8b5cf6',
  '#64748b','#dc2626','#d946ef','#0ea5e9','#7c3aed',
  '#b45309','#be123c','#15803d','#0e7490','#9f1239',
  '#7e22ce','#b91c1c','#c2410c','#0369a1','#4f46e5'
];
const INCOME_COLORS = [
  '#10b981','#3b82f6','#06b6d4','#84cc16','#a78bfa',
  '#2dd4bf','#059669','#34d399','#60a5fa','#4ade80',
  '#22d3ee','#818cf8','#f472b6','#fb923c','#facc15',
  '#a3e635','#38bdf8','#c084fc','#67e8f9','#86efac'
];

const formatIDR = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

// Custom Tooltip
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-100 text-sm">
        <p className="font-semibold text-slate-800 mb-1">{payload[0].name}</p>
        <p className="text-slate-600">{formatIDR(payload[0].value)}</p>
        {payload[0].payload.pct != null && (
          <p className="text-xs text-slate-400 mt-0.5">{payload[0].payload.pct}%</p>
        )}
      </div>
    );
  }
  return null;
};

// Custom scalable Legend with flex-wrap
function CustomLegend({ data, colors }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mt-3 px-1">
      {data.map((entry, i) => (
        <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: colors[i % colors.length] }}
          />
          <span className="font-medium truncate max-w-[110px]" title={entry.name}>{entry.name}</span>
          <span className="text-slate-400 font-normal">
            {total > 0 ? `${Math.round((entry.value / total) * 100)}%` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// Single pie chart card
function SinglePieChart({ data, colors, emptyText, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[220px] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-300 mb-2" />
        <p className="text-xs">Memuat data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[220px] text-slate-400 text-sm">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200/50 mb-3 border-t-slate-300" />
        <p>{emptyText}</p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);
  const enriched = data.map(d => ({ ...d, pct: Math.round((d.value / total) * 100) }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={enriched}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={88}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {enriched.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <CustomLegend data={enriched} colors={colors} />
    </div>
  );
}

// Main exported component
export default function DualChart({ userId, refreshKey }) {
  const now = new Date();
  const [mode, setMode] = useState('all'); // 'all' | 'monthly'
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

  const [expenseData, setExpenseData] = useState([]);
  const [incomeData,  setIncomeData]  = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChartData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const params = { userId, _t: Date.now() };
      if (mode === 'monthly') {
        params.year  = selectedYear;
        params.month = selectedMonth;
      }
      const res = await axios.get(`${API_BASE_URL}/api/chart-data`, { params });
      setExpenseData(res.data.data.expenseData);
      setIncomeData(res.data.data.incomeData);
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
    } finally {
      setLoading(false);
    }
  // refreshKey is intentionally in deps to trigger re-fetch after mutations
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mode, selectedYear, selectedMonth, refreshKey]);

  useEffect(() => { fetchChartData(); }, [fetchChartData]);

  const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const years = [now.getFullYear() - 1, now.getFullYear()];
  const hasData = expenseData.length > 0 || incomeData.length > 0;

  return (
    <div className="glass-card h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-500" /> Grafik Kategori
        </h3>

        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-semibold">
            <button
              onClick={() => setMode('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${mode === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Semua Waktu
            </button>
            <button
              onClick={() => setMode('monthly')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${mode === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Calendar className="w-3 h-3" /> Bulanan
            </button>
          </div>

          {mode === 'monthly' && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      {!loading && !hasData ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-400 text-sm">
          <div className="w-16 h-16 rounded-full border-4 border-slate-200/50 mb-3 border-t-slate-300" />
          <p>Belum ada data transaksi{mode === 'monthly' ? ' di bulan ini' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-rose-50/40 rounded-2xl p-3 border border-rose-100/60">
            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider text-center mb-2">
              💸 Pengeluaran
            </p>
            <SinglePieChart
              data={expenseData}
              colors={EXPENSE_COLORS}
              emptyText="Belum ada pengeluaran"
              loading={loading}
            />
          </div>

          <div className="bg-emerald-50/40 rounded-2xl p-3 border border-emerald-100/60">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider text-center mb-2">
              ✅ Pemasukan
            </p>
            <SinglePieChart
              data={incomeData}
              colors={INCOME_COLORS}
              emptyText="Belum ada pemasukan"
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
