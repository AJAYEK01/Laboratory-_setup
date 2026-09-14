import React, { useState } from 'react';
import { 
  Activity, 
  Lock, 
  User, 
  Building2, 
  ShieldCheck, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [loginType, setLoginType] = useState<'technician' | 'owner'>('technician');

  // Technician Form
  const [techUsername, setTechUsername] = useState('');
  const [techPassword, setTechPassword] = useState('');

  // Owner Form
  const [ownerUsername, setOwnerUsername] = useState('owner');
  const [ownerPassword, setOwnerPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTechLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const pwd = techPassword.trim();
    if (!pwd) {
      setErrorMessage('Please enter your branch password.');
      return;
    }

    setIsLoading(true);
    const username = techUsername.trim();
    const result = await login(username, pwd);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.message || 'Invalid password. Please enter the unique password for your branch.');
    }
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const pwd = ownerPassword.trim();
    if (!pwd) {
      setErrorMessage('Please enter owner password.');
      return;
    }

    setIsLoading(true);
    const username = ownerUsername.trim() || 'owner';
    const result = await login(username, pwd);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.message || 'Invalid owner credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 font-sans select-none">
      {/* Container */}
      <div className="max-w-md w-full">
        {/* Lab Branding Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-teal-800 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase font-sans">
            DIVINE LABORATORY
          </h1>
          {/* Only place names in Malayalam using Manjeri font */}
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 font-semibold font-manjari">
            കൂട്ടുമ്മുഖം (ശ്രീകണ്ഠപുരം) &amp; ചന്ദനക്കാംപാറ (പയ്യാവൂർ)
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Two Login Tabs: Technician vs Owner */}
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => { setLoginType('technician'); setErrorMessage(null); }}
              className={`py-3.5 text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                loginType === 'technician'
                  ? 'bg-white text-teal-800 border-b-2 border-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Technician Login</span>
            </button>

            <button
              type="button"
              onClick={() => { setLoginType('owner'); setErrorMessage(null); }}
              className={`py-3.5 text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                loginType === 'owner'
                  ? 'bg-white text-teal-800 border-b-2 border-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Owner Login</span>
            </button>
          </div>

          <div className="p-6">
            {/* Error message */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Technician Login Form */}
            {loginType === 'technician' && (
              <form onSubmit={handleTechLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Branch Username / ID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="koottummugham or chandanakkampara"
                      value={techUsername}
                      onChange={(e) => setTechUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-teal-700 focus:outline-none text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unique Branch Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      placeholder="Enter unique branch password"
                      value={techPassword}
                      onChange={(e) => setTechPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-teal-700 focus:outline-none text-xs font-medium text-slate-800"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    Entering your unique branch password automatically opens your branch counter.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1.5 text-slate-600">
                  <span className="font-bold text-slate-800 block uppercase text-[10px] tracking-wider">
                    Branch Passwords:
                  </span>
                  <div className="flex items-center justify-between">
                    <span><strong className="font-manjari font-bold text-teal-800">കൂട്ടുമ്മുഖം</strong> (Koottummugham):</span>
                    <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px] text-teal-900 font-bold">Koottummugham@2026</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span><strong className="font-manjari font-bold text-teal-800">ചന്ദനക്കാംപാറ</strong> (Chandanakkampara):</span>
                    <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px] text-teal-900 font-bold">Chandanakkampara@2026</code>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <span>{isLoading ? 'Verifying...' : 'Login to Branch Counter'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Owner Login Form */}
            {loginType === 'owner' && (
              <form onSubmit={handleOwnerLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Owner Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Username (e.g. owner)"
                      value={ownerUsername}
                      onChange={(e) => setOwnerUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-teal-700 focus:outline-none text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unique Owner Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      placeholder="Enter owner password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-teal-700 focus:outline-none text-xs font-medium text-slate-800"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] flex items-center justify-between text-slate-600">
                  <span className="font-semibold text-slate-700">Owner Password:</span>
                  <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px] text-slate-900 font-bold">Owner@Divine2026</code>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <span>{isLoading ? 'Verifying...' : 'Login to Executive Portal'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 mt-4">
          Divine Laboratory Information Management System • 100% Offline Local
        </p>
      </div>
    </div>
  );
};
