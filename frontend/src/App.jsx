import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import TransactionForm from "./components/TransactionForm";
import DashboardCards from "./components/DashboardCards";
import DualChart from "./components/ExpenseChart";
import TransactionHistory from "./components/TransactionHistory";
import GuideModal from "./components/GuideModal";
import KeywordsManager from "./components/KeywordsManager";
import BottomNav from "./components/BottomNav";
import SettingsView from "./components/SettingsView";

// Hardcoded userId for MVP as per plan
const USER_ID = "11111111-1111-1111-1111-111111111111";
const VITE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const LIMIT = 10;

const normalizeApiBase = (value) => {
  if (!value) return "http://localhost:3000";
  return value.replace(/\/api\/transactions\/?$/, "").replace(/\/api\/?$/, "");
};

const API_BASE_URL = normalizeApiBase(VITE_API_URL);
const TRANSACTIONS_URL = `${API_BASE_URL}/api/transactions`;

function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState("home");

  // Data States
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // UI States
  const [showGuide, setShowGuide] = useState(false);
  const [showKeywords, setShowKeywords] = useState(false);

  // Memoized fetch function
  const fetchTransactions = useCallback(async () => {
    try {
      const response = await axios.get(TRANSACTIONS_URL, {
        params: { userId: USER_ID, limit: LIMIT, page: 1, _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      setTransactions(response.data.data);
      setHasMore(response.data.meta.hasMore);
      setPage(1);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized load more
  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await axios.get(TRANSACTIONS_URL, {
        params: { userId: USER_ID, limit: LIMIT, page: nextPage, _t: Date.now() },
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      setTransactions((prev) => [...prev, ...response.data.data]);
      setHasMore(response.data.meta.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error("Failed to load more transactions:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Memoized handlers
  const handleAddTransaction = useCallback(async (text) => {
    try {
      await axios.post(TRANSACTIONS_URL, { text, userId: USER_ID });
      await fetchTransactions();
    } catch (error) {
      console.error("Failed to add transaction:", error);
      alert("Gagal menyimpan transaksi. Periksa kembali format teks Anda.");
    }
  }, [fetchTransactions]);

  const handleDeleteTransaction = useCallback(async (id) => {
    try {
      await axios.delete(`${TRANSACTIONS_URL}/${id}`);
      await fetchTransactions();
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      alert("Gagal menghapus transaksi.");
    }
  }, [fetchTransactions]);

  // Memoized Metrics Calculations (Heavy tasks deferred from re-rendering)
  const metrics = useMemo(() => {
    let currentBalance = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(curr => {
      if (curr.type === "INCOME") {
        currentBalance += curr.amount;
        totalIncome += curr.amount;
      } else {
        currentBalance -= curr.amount;
        totalExpense += curr.amount;
      }
    });

    return { currentBalance, totalIncome, totalExpense };
  }, [transactions]);

  // Memoized Chart Data
  const chartData = useMemo(() => {
    const buildCategoryMap = (type) =>
      transactions
        .filter((t) => t.type === type)
        .reduce((acc, curr) => {
          acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
          return acc;
        }, {});

    return {
      expenseData: Object.entries(buildCategoryMap("EXPENSE")).map(([name, value]) => ({ name, value })),
      incomeData: Object.entries(buildCategoryMap("INCOME")).map(([name, value]) => ({ name, value }))
    };
  }, [transactions]);

  // Renders the main content based on active tab
  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-20 text-slate-400 animate-pulse font-medium">Memuat data...</div>;
    }

    switch (activeTab) {
      case "home":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TransactionForm onSubmit={handleAddTransaction} />
            <DashboardCards
              balance={metrics.currentBalance}
              income={metrics.totalIncome}
              expense={metrics.totalExpense}
            />
          </div>
        );
      
      case "transactions":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 h-full">
            <TransactionHistory
              transactions={transactions}
              onDelete={handleDeleteTransaction}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              loadingMore={loadingMore}
            />
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <DualChart expenseData={chartData.expenseData} incomeData={chartData.incomeData} />
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SettingsView 
              onToggleKeywords={() => setShowKeywords(!showKeywords)} 
              onOpenGuide={() => setShowGuide(true)} 
            />
            {showKeywords && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-4">
                <KeywordsManager apiBaseUrl={VITE_API_URL} />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Stays fixed on top visually */}
      <div className="sticky top-0 z-40 bg-slate-50/90 backdrop-blur-md border-b border-slate-200/50 shadow-sm px-4 sm:px-6 lg:px-8 py-4 mb-4">
        <div className="max-w-md md:max-w-2xl lg:max-w-5xl mx-auto flex items-center justify-center sm:justify-start">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            woww my money <span className="text-blue-500">.</span>
          </h1>
        </div>
      </div>

      {/* Main Content Area - with padding bottom to avoid BottomNav overlap */}
      <main className="px-4 sm:px-6 lg:px-8 max-w-md md:max-w-2xl lg:max-w-5xl mx-auto pb-24">
        {renderContent()}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />

      {/* Modals */}
      {showGuide && (
        <GuideModal
          apiBaseUrl={VITE_API_URL}
          onClose={() => setShowGuide(false)}
        />
      )}
    </div>
  );
}

export default App;
