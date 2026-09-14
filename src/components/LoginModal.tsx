import React, { useState } from 'react';
import { Shield, Lock, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginModal: React.FC = () => {
  const { login, isLoginModalOpen, setIsLoginModalOpen } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const res = await login(username.trim(), password);
    setIsLoading(false);

    if (!res.success) {
      setError(res.message || 'Login failed. Check your username and password.');
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-8 relative">
        <button
          onClick={() => setIsLoginModalOpen(false)}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">LabPulse Central Login</h3>
            <p className="text-xs text-slate-500">Secure Medical Access &amp; Multi-Branch Control</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. owner or tech_rampur"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {isLoading ? 'Verifying Credentials...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Logins Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Quick Select Roles (Demo Accounts)
          </p>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => handleQuickFill('owner', 'Owner@2026!')}
              className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 text-xs flex justify-between items-center transition-colors"
            >
              <div>
                <strong className="text-slate-900 block font-semibold">👑 Lab Owner (All Branches)</strong>
                <span className="text-[10px] text-slate-500">username: owner</span>
              </div>
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-mono">Fill</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('tech_rampur', 'Tech@123!')}
              className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 text-xs flex justify-between items-center transition-colors"
            >
              <div>
                <strong className="text-slate-900 block font-semibold">🏥 Branch 1 Tech (Village Rampur)</strong>
                <span className="text-[10px] text-slate-500">username: tech_rampur</span>
              </div>
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-mono">Fill</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('tech_tehsil', 'Tech@123!')}
              className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 text-xs flex justify-between items-center transition-colors"
            >
              <div>
                <strong className="text-slate-900 block font-semibold">🏥 Branch 2 Tech (Tehsil HQ Central)</strong>
                <span className="text-[10px] text-slate-500">username: tech_tehsil</span>
              </div>
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-mono">Fill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
