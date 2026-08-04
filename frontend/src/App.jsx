import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import TransactionForm from "./components/TransactionForm";
import DashboardCards from "./components/DashboardCards";
import DualChart from "./components/ExpenseChart";
import TransactionHistory from "./components/TransactionHistory";
import GuideModal from "./components/GuideModal";
import KeywordsManager from "./components/KeywordsManager";
import BottomNav from "./components/BottomNav";
import SettingsView from "./components/SettingsView";
import Login from "./components/Login";
import SavingsView from "./components/SavingsView";
import DebtView from "./components/DebtView";

const VITE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const LIMIT = 10;

const normalizeApiBase = (value) => {
  if (!value) return "http://localhost:3000";
  return value.replace(/\/api\/transactions\/?$/, "").replace(/\/api\/?$/, "");
};

const API_BASE_URL = normalizeApiBase(VITE_API_URL);
const TRANSACTIONS_URL = `${API_BASE_URL}/api/transactions`;

function App() {
  // Auth State
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('fintext_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('fintext_active_tab') || 'home';
  });

  useEffect(() => {
    localStorage.setItem('fintext_active_tab', activeTab);
  }, [activeTab]);

  // Data States
  const [transactions, setTransactions] = useState([]);
  const [metrics, setMetrics] = useState({ currentBalance: 0, totalIncome: 0, totalExpense: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Bumped after every mutation so child components know to re-fetch derived data
  const [mutationKey, setMutationKey] = useState(0);
  
  // UI States
  const [showGuide, setShowGuide] = useState(false);
  const [showKeywords, setShowKeywords] = useState(false);

  const handleLogin = (userData) => {
    localStorage.setItem('fintext_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('fintext_user');
    setUser(null);
    setTransactions([]);
    setActiveTab("home");
  };

  // Memoized fetch function
  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const [txRes, metricsRes] = await Promise.all([
        axios.get(TRANSACTIONS_URL, {
          params: { userId: user.id, limit: LIMIT, page: 1, _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        }),
        axios.get(`${API_BASE_URL}/api/metrics`, {
          params: { userId: user.id, _t: Date.now() },
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        })
      ]);
      setTransactions(txRes.data.data);
      setHasMore(txRes.data.meta.hasMore);
      setPage(1);
      setMetrics(metricsRes.data.data);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Memoized load more
  const handleLoadMore = useCallback(async () => {
    if (!user) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await axios.get(TRANSACTIONS_URL, {
        params: { userId: user.id, limit: LIMIT, page: nextPage, _t: Date.now() },
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
  }, [page, user]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [fetchTransactions, user]);

  // Memoized handlers
  const handleAddTransaction = useCallback(async (text) => {
    if (!user) return;
    try {
      await axios.post(TRANSACTIONS_URL, { text, userId: user.id });
      await fetchTransactions();
      setMutationKey(k => k + 1);
    } catch (error) {
      console.error("Failed to add transaction:", error);
      alert("Gagal menyimpan transaksi. Periksa kembali format teks Anda.");
    }
  }, [fetchTransactions, user]);

  const handleDeleteTransaction = useCallback(async (id) => {
    try {
      await axios.delete(`${TRANSACTIONS_URL}/${id}`);
      await fetchTransactions();
      setMutationKey(k => k + 1);
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      alert("Gagal menghapus transaksi.");
    }
  }, [fetchTransactions]);

  const handleResetAllData = useCallback(async () => {
    if (!user) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/transactions`, {
        params: { userId: user.id }
      });
      await fetchTransactions();
      setMutationKey(k => k + 1);
      alert("Semua data transaksi harian, utang-piutang, dan tabungan Anda berhasil dihapus!");
    } catch (error) {
      console.error("Failed to reset data:", error);
      alert("Gagal menghapus data.");
    }
  }, [fetchTransactions, user]);

  // Universal data-changed handler: re-fetches metrics + transactions
  // AND bumps mutationKey so ALL child subscribers (chart, history, summary) react instantly.
  const handleDataChanged = useCallback(async () => {
    await fetchTransactions();
    setMutationKey(k => k + 1);
  }, [fetchTransactions]);

  // (Metrics calculation moved to backend for accuracy)

  // Chart data is now fetched directly by DualChart component from /api/chart-data
  // (uses DB-level groupBy so all categories appear regardless of pagination)

  // If not authenticated, force Login View
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

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
              userId={user?.id}
              refreshKey={mutationKey}
            />
          </div>
        );

      case "savings":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SavingsView
              user={user}
              apiBaseUrl={API_BASE_URL + '/api'}
              onMetricsChanged={handleDataChanged}
              refreshKey={mutationKey}
            />
          </div>
        );

      case "debts":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <DebtView
              user={user}
              apiBaseUrl={API_BASE_URL + '/api'}
              onMetricsChanged={handleDataChanged}
              refreshKey={mutationKey}
            />
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <DualChart userId={user?.id} refreshKey={mutationKey} />
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SettingsView 
              user={user}
              onLogout={handleLogout}
              onToggleKeywords={() => setShowKeywords(!showKeywords)} 
              onOpenGuide={() => setShowGuide(true)} 
              onResetAll={handleResetAllData}
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
