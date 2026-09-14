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
  const [selectedBranch, setSelectedBranch] = useState<'branch-01' | 'branch-02'>('branch-01');
  const [techPassword, setTechPassword] = useState('');

  // Owner Form
  const [ownerUsername, setOwnerUsername] = useState('owner');
  const [ownerPassword, setOwnerPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTechLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const username = selectedBranch === 'branch-01' ? 'tech_koottummugham' : 'tech_chandanakkampara';
    const pwd = techPassword.trim() || 'Tech@123!';

    const result = await login(username, pwd);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.message || 'Login failed. Please check your password.');
    }
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const username = ownerUsername.trim() || 'owner';
    const pwd = ownerPassword.trim() || 'Owner@2026!';

    const result = await login(username, pwd);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.message || 'Invalid owner credentials.');
    }
  };

  const handleQuickLogin = async (type: 'tech1' | 'tech2' | 'owner') => {
    setIsLoading(true);
    setErrorMessage(null);

    let res;
    if (type === 'tech1') {
      res = await login('tech_koottummugham', 'Tech@123!');
    } else if (type === 'tech2') {
      res = await login('tech_chandanakkampara', 'Tech@123!');
    } else {
      res = await login('owner', 'Owner@2026!');
    }

    setIsLoading(false);
    if (!res.success) {
      setErrorMessage(res.message || 'Quick login failed.');
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            DIVINE LABORATORY
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Koottummugham (Sreekandapuram) &amp; Chandanakkampara (Payyavoor)
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Two Login Tabs: Technician vs Owner */}
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => { setLoginType('technician'); setErrorMessage(null); }}
              className={`py-3 text-xs font-bold transition-all flex items-center justify-center gap-2 ${
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
              className={`py-3 text-xs font-bold transition-all flex items-center justify-center gap-2 ${
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
                    Select Your Branch
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBranch('branch-01')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedBranch === 'branch-01'
                          ? 'border-teal-700 bg-teal-50/70 text-teal-950 ring-1 ring-teal-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-teal-800 uppercase block">Branch 1 (BR01)</span>
                      <strong className="text-xs font-bold text-slate-900 block mt-0.5">Koottummugham</strong>
                      <span className="text-[10px] text-slate-500 block">Sreekandapuram</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedBranch('branch-02')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedBranch === 'branch-02'
                          ? 'border-teal-700 bg-teal-50/70 text-teal-950 ring-1 ring-teal-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-teal-800 uppercase block">Branch 2 (BR02)</span>
                      <strong className="text-xs font-bold text-slate-900 block mt-0.5">Chandanakkampara</strong>
                      <span className="text-[10px] text-slate-500 block">Payyavoor</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Technician Access Code / Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      placeholder="Enter password (default: Tech@123!)"
                      value={techPassword}
                      onChange={(e) => setTechPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-teal-700 focus:outline-none text-xs font-medium text-slate-800"
                    />
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
                    Owner Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      placeholder="Enter owner password (default: Owner@2026!)"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-teal-700 focus:outline-none text-xs font-medium text-slate-800"
                    />
                  </div>
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

            {/* Quick 1-Click Access for Local Offline Operation */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                1-Click Quick Access:
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('tech1')}
                  className="p-1.5 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 rounded-lg text-slate-700 font-semibold text-center transition-colors"
                >
                  Koottummugham
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('tech2')}
                  className="p-1.5 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 border border-slate-200 rounded-lg text-slate-700 font-semibold text-center transition-colors"
                >
                  Chandanakkampara
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('owner')}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold text-center transition-colors"
                >
                  Owner Portal
                </button>
              </div>
            </div>

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
