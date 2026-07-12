import { useState } from 'react';
import { SendHorizontal } from 'lucide-react';

export default function TransactionForm({ onSubmit }) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setIsSubmitting(true);
    await onSubmit(text);
    setText('');
    setIsSubmitting(false);
  };

  return (
    <div className="glass-card mb-6">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Misal: beli makanan bakso 12.000 atau dapat gaji 120000..."
          className="glass-input w-full pr-16 text-lg sm:text-base placeholder-slate-400 text-slate-800"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={!text.trim() || isSubmitting}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-sm"
          aria-label="Simpan"
        >
          <SendHorizontal className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
