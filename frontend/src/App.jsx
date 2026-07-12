import { useState, useEffect } from 'react';
import axios from 'axios';
import TransactionForm from './components/TransactionForm';
import DashboardCards from './components/DashboardCards';
import DualChart from './components/ExpenseChart';
import TransactionHistory from './components/TransactionHistory';
import GuideModal from './components/GuideModal';
import KeywordsManager from './components/KeywordsManager';
import { HelpCircle, Tag, ChevronDown, ChevronUp } from 'lucide-react';

// Hardcoded userId for MVP as per plan
const USER_ID = '11111111-1111-1111-1111-111111111111';
const API_BASE_URL = import.meta.env.VITE_API_URL;
const LIMIT = 10;

function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showKeywords, setShowKeywords] = useState(false);

  // Fetch initial or refreshed page 1 (replaces all transactions)
  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API_URL}?userId=${USER_ID}&limit=${LIMIT}&page=1`);
      setTransactions(response.data.data);
      setHasMore(response.data.meta.hasMore);
      setPage(1);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Append next page to existing list
  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await axios.get(`${API_URL}?userId=${USER_ID}&limit=${LIMIT}&page=${nextPage}`);
      setTransactions(prev => [...prev, ...response.data.data]);
      setHasMore(response.data.meta.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleAddTransaction = async (text) => {
    try {
      await axios.post(API_URL, { text, userId: USER_ID });
      fetchTransactions();
    } catch (error) {
      console.error('Failed to add transaction:', error);
      alert('Gagal menyimpan transaksi. Periksa kembali format teks Anda.');
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Gagal menghapus transaksi.');
    }
  };

  // Calculate metrics from all loaded transactions
  const currentBalance = transactions.reduce((acc, curr) =>
    curr.type === 'INCOME' ? acc + curr.amount : acc - curr.amount, 0);

  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Prepare data for dual charts
  const buildCategoryMap = (type) =>
    transactions
      .filter(t => t.type === type)
      .reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {});

  const expenseData = Object.entries(buildCategoryMap('EXPENSE')).map(([name, value]) => ({ name, value }));
  const incomeData  = Object.entries(buildCategoryMap('INCOME')).map(([name, value]) => ({ name, value }));

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">

      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
            woww my money <span className="text-blue-500">.</span>
          </h1>
          <p className="text-slate-500">Pencatatan Keuangan Secepat Chatting.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          <button
            id="toggle-keywords-btn"
            onClick={() => setShowKeywords(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-colors"
            aria-label="Kelola kata kunci"
          >
            <Tag className="w-4 h-4 text-violet-500" />
            <span className="hidden sm:inline">Kata Kunci</span>
            {showKeywords
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />
            }
          </button>
          <button
            id="open-guide-btn"
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-colors"
            aria-label="Buka panduan cara penggunaan"
          >
            <HelpCircle className="w-4 h-4 text-blue-500" />
            <span className="hidden sm:inline">Panduan</span>
          </button>
        </div>
      </header>

      <main className="space-y-6">
        {/* Transaction Form */}
        <TransactionForm onSubmit={handleAddTransaction} />

        {/* Keywords Manager (collapsible) */}
        {showKeywords && (
          <KeywordsManager apiBaseUrl={API_URL} />
        )}

        {loading ? (
          <div className="text-center py-10 text-slate-400 animate-pulse">Memuat data...</div>
        ) : (
          <>
            {/* Dashboard Summary Cards */}
            <DashboardCards
              balance={currentBalance}
              income={totalIncome}
              expense={totalExpense}
            />

            {/* Dual Chart — full width */}
            <DualChart expenseData={expenseData} incomeData={incomeData} />

            {/* Transaction History — full width */}
            <TransactionHistory
              transactions={transactions}
              onDelete={handleDeleteTransaction}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              loadingMore={loadingMore}
            />
          </>
        )}
      </main>

      {/* Guide Modal */}
      {showGuide && (
        <GuideModal apiBaseUrl={API_URL} onClose={() => setShowGuide(false)} />
      )}
    </div>
  );
}

export default App;
