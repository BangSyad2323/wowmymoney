import { useState } from 'react';
import { Lock, User as UserIcon } from 'lucide-react';

const DUMMY_USERS = [
  { username: 'arsyad', password: 'qazwsxedc', id: '11111111-1111-1111-1111-111111111111' },
  { username: 'cahaya', password: '08052007', id: '22222222-2222-2222-2222-222222222222' }
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = DUMMY_USERS.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin({ username: user.username, id: user.id });
    } else {
      setError('Username atau password salah.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full glass-card p-8 bg-white/80">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            woww my money <span className="text-blue-500">.</span>
          </h1>
          <p className="text-slate-500">Silakan login untuk melanjutkan</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-lg text-sm text-center border border-rose-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-input w-full pl-10"
                placeholder="Username"
                required
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full pl-10"
                placeholder="Password"
                required
              />
            </div>
          </div>
          
          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors mt-2">
            Masuk
          </button>
        </form>

        {/* <div className="mt-6 pt-6 border-t border-slate-200/60">
          <p className="text-sm text-slate-500 mb-2 font-medium">Akun Dummy Tes:</p>
          <div className="text-xs text-slate-600 grid grid-cols-2 gap-2">
            <div className="bg-slate-100 p-2 rounded"><b>arsyad</b><br/>qazwsxedc</div>
            <div className="bg-slate-100 p-2 rounded"><b>cahaya</b><br/>08052007</div>
          </div>
        </div> */}
      </div>
    </div>
  );
}
