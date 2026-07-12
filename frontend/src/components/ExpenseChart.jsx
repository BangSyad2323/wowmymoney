import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const EXPENSE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b', '#dc2626'];
const INCOME_COLORS  = ['#10b981', '#3b82f6', '#06b6d4', '#84cc16', '#a78bfa', '#2dd4bf', '#059669'];

const formatIDR = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-100 text-sm">
        <p className="font-semibold text-slate-800 mb-1">{payload[0].name}</p>
        <p className="text-slate-600">{formatIDR(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

function SinglePieChart({ data, colors, title, emptyText }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[220px] text-slate-400 text-sm">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200/50 mb-3 border-t-slate-300" />
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ minHeight: 240 }}>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DualChart({ expenseData, incomeData }) {
  const hasData = (expenseData && expenseData.length > 0) || (incomeData && incomeData.length > 0);

  return (
    <div className="glass-card h-full">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Grafik Kategori</h3>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-400 text-sm">
          <div className="w-16 h-16 rounded-full border-4 border-slate-200/50 mb-3 border-t-slate-300" />
          <p>Belum ada data transaksi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Expense Chart */}
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide text-center mb-1">
              💸 Pengeluaran
            </p>
            <SinglePieChart
              data={expenseData}
              colors={EXPENSE_COLORS}
              title="Pengeluaran"
              emptyText="Belum ada pengeluaran"
            />
          </div>

          {/* Income Chart */}
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide text-center mb-1">
              ✅ Pemasukan
            </p>
            <SinglePieChart
              data={incomeData}
              colors={INCOME_COLORS}
              title="Pemasukan"
              emptyText="Belum ada pemasukan"
            />
          </div>
        </div>
      )}
    </div>
  );
}
