import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Tag } from "lucide-react";

const normalizeApiBase = (value) => {
  if (!value) return "http://localhost:3000";
  return value.replace(/\/api\/transactions\/?$/, "").replace(/\/api\/?$/, "");
};

export default function KeywordsManager({ apiBaseUrl }) {
  const BASE = normalizeApiBase(apiBaseUrl);
  const KEYWORDS_URL = `${BASE}/api/keywords`;

  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState("");
  const [newType, setNewType] = useState("EXPENSE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchKeywords = async () => {
    try {
      const res = await fetch(KEYWORDS_URL);
      const json = await res.json();
      setKeywords(json.data);
    } catch {
      setError("Gagal memuat kata kunci.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(KEYWORDS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: newKeyword.trim().toLowerCase(),
          type: newType,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Gagal menambah kata kunci.");
      } else {
        setNewKeyword("");
        await fetchKeywords();
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${KEYWORDS_URL}/${id}`, { method: "DELETE" });
      setKeywords((prev) => prev.filter((k) => k.id !== id));
    } catch {
      setError("Gagal menghapus kata kunci.");
    }
  };

  const incomeKws = keywords.filter((k) => k.type === "INCOME");
  const expenseKws = keywords.filter((k) => k.type === "EXPENSE");

  return (
    <div className="glass-card">
      <div className="flex items-center gap-2 mb-5">
        <Tag className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-slate-800">
          Kelola Kata Kunci
        </h3>
      </div>

      {/* Add Form */}
      <form
        onSubmit={handleAdd}
        className="flex gap-2 mb-5 flex-wrap sm:flex-nowrap"
      >
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          placeholder="Tambah kata kunci baru..."
          className="glass-input flex-1 min-w-0"
          disabled={submitting}
          id="keyword-input"
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          className="glass-input w-36 flex-shrink-0"
          disabled={submitting}
          id="keyword-type-select"
        >
          <option value="EXPENSE">Pengeluaran</option>
          <option value="INCOME">Pemasukan</option>
        </select>
        <button
          type="submit"
          id="add-keyword-btn"
          disabled={submitting || !newKeyword.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Tambah
        </button>
      </form>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Income Keywords */}
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
              ✅ Pemasukan ({incomeKws.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {incomeKws.map((k) => (
                <span
                  key={k.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-mono"
                >
                  {k.keyword}
                  <button
                    onClick={() => handleDelete(k.id)}
                    className="text-emerald-400 hover:text-rose-600 transition-colors ml-0.5"
                    aria-label={`Hapus kata kunci ${k.keyword}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {incomeKws.length === 0 && (
                <span className="text-xs text-slate-400">Belum ada</span>
              )}
            </div>
          </div>

          {/* Expense Keywords */}
          <div>
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-2">
              💸 Pengeluaran ({expenseKws.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {expenseKws.map((k) => (
                <span
                  key={k.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-md text-xs font-mono"
                >
                  {k.keyword}
                  <button
                    onClick={() => handleDelete(k.id)}
                    className="text-rose-300 hover:text-rose-600 transition-colors ml-0.5"
                    aria-label={`Hapus kata kunci ${k.keyword}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {expenseKws.length === 0 && (
                <span className="text-xs text-slate-400">Belum ada</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
