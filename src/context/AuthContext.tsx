import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthUser, Branch } from '../types/lab';
import { defaultBranches } from '../db/defaultData';
import { db } from '../db/index';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  currentBranch: Branch;
  availableBranches: Branch[];
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchBranch: (branchId: string) => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('lab_auth_token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('lab_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [availableBranches, setAvailableBranches] = useState<Branch[]>(defaultBranches);
  const [currentBranch, setCurrentBranch] = useState<Branch>(() => {
    const saved = localStorage.getItem('lab_current_branch');
    return saved ? JSON.parse(saved) : defaultBranches[0];
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Sync settings with current branch
  useEffect(() => {
    if (currentBranch) {
      db.settings.get('lab_profile').then(settings => {
        if (settings && settings.currentBranchId !== currentBranch.id) {
          db.settings.update('lab_profile', {
            currentBranchId: currentBranch.id,
            currentBranchCode: currentBranch.code,
            currentBranchName: currentBranch.name,
          });
        }
      });
    }
  }, [currentBranch.id]);

  // Fetch branches from central server if online
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/branches');
        if (res.ok) {
          const data = await res.json();
          if (data.branches && data.branches.length > 0) {
            setAvailableBranches(data.branches);
          }
        }
      } catch {
        // Offline mode: keep local default branches
      }
    };
    fetchBranches();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, message: data.message || 'Login failed.' };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('lab_auth_token', data.token);
      localStorage.setItem('lab_auth_user', JSON.stringify(data.user));

      // If user is assigned to a specific branch, switch automatically
      if (data.user.branch) {
        setCurrentBranch(data.user.branch);
        localStorage.setItem('lab_current_branch', JSON.stringify(data.user.branch));
      }

      setIsLoginModalOpen(false);
      return { success: true };
    } catch {
      // Offline fallback authentication with UNIQUE passwords for both branches and owner
      const normUser = (username || '').trim().toLowerCase();
      const pwd = (password || '').trim();

      // 1. OWNER AUTHENTICATION
      const isOwnerPwd = pwd === 'Owner@Divine2026' || pwd === 'Owner@2026!' || pwd === 'owner';
      if ((normUser === 'owner' || normUser === 'admin' || normUser === '') && isOwnerPwd) {
        const ownerUser: AuthUser = {
          id: 'user-owner',
          username: 'owner',
          fullName: 'Lab Owner / Director (Divine Laboratory)',
          role: 'owner',
          branchId: null,
        };
        setUser(ownerUser);
        setToken('offline-demo-token-owner');
        localStorage.setItem('lab_auth_token', 'offline-demo-token-owner');
        localStorage.setItem('lab_auth_user', JSON.stringify(ownerUser));
        setIsLoginModalOpen(false);
        return { success: true };
      }

      // 2. BRANCH 1: KOOTTUMMUGHAM AUTHENTICATION (Unique Password)
      const isBranch1Pwd = pwd === 'Koottummugham@2026' || 
                           pwd === 'Koottummugham@123' || 
                           pwd === 'Tech@BR01' || 
                           pwd === 'Divine@BR01' ||
                           ((normUser === 'tech_koottummugham' || normUser === 'koottummugham' || normUser === 'br01' || normUser === 'branch-01') && (pwd === 'Tech@123!' || pwd === 'tech'));

      if (isBranch1Pwd && (normUser === '' || normUser === 'tech_koottummugham' || normUser === 'koottummugham' || normUser === 'br01' || normUser === 'branch-01' || normUser === 'tech1')) {
        const branch = defaultBranches[0]; // Koottummugham
        const techUser: AuthUser = {
          id: 'user-tech-koottummugham',
          username: 'tech_koottummugham',
          fullName: 'Medical Lab Technician (Koottummugham Branch)',
          role: 'technician',
          branchId: branch.id,
          branch,
        };
        setUser(techUser);
        setCurrentBranch(branch);
        setToken('offline-demo-token-tech1');
        localStorage.setItem('lab_auth_token', 'offline-demo-token-tech1');
        localStorage.setItem('lab_auth_user', JSON.stringify(techUser));
        localStorage.setItem('lab_current_branch', JSON.stringify(branch));
        setIsLoginModalOpen(false);
        return { success: true };
      }

      // 3. BRANCH 2: CHANDANAKKAMPARA AUTHENTICATION (Unique Password)
      const isBranch2Pwd = pwd === 'Chandanakkampara@2026' || 
                           pwd === 'Chandanakkampara@123' || 
                           pwd === 'Tech@BR02' || 
                           pwd === 'Divine@BR02' ||
                           ((normUser === 'tech_chandanakkampara' || normUser === 'chandanakkampara' || normUser === 'br02' || normUser === 'branch-02') && (pwd === 'Tech@123!' || pwd === 'tech'));

      if (isBranch2Pwd && (normUser === '' || normUser === 'tech_chandanakkampara' || normUser === 'chandanakkampara' || normUser === 'br02' || normUser === 'branch-02' || normUser === 'tech2')) {
        const branch = defaultBranches[1]; // Chandanakkampara
        const techUser: AuthUser = {
          id: 'user-tech-chandanakkampara',
          username: 'tech_chandanakkampara',
          fullName: 'Medical Lab Technician (Chandanakkampara Branch)',
          role: 'technician',
          branchId: branch.id,
          branch,
        };
        setUser(techUser);
        setCurrentBranch(branch);
        setToken('offline-demo-token-tech2');
        localStorage.setItem('lab_auth_token', 'offline-demo-token-tech2');
        localStorage.setItem('lab_auth_user', JSON.stringify(techUser));
        localStorage.setItem('lab_current_branch', JSON.stringify(branch));
        setIsLoginModalOpen(false);
        return { success: true };
      }

      return { success: false, message: 'Invalid credentials. Please enter the correct password.' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lab_auth_token');
    localStorage.removeItem('lab_auth_user');
  };

  const switchBranch = (branchId: string) => {
    // Only owner can switch branches; technicians are permanently locked to their branch
    if (user && user.role !== 'owner') {
      return;
    }
    const target = availableBranches.find(b => b.id === branchId);
    if (target) {
      setCurrentBranch(target);
      localStorage.setItem('lab_current_branch', JSON.stringify(target));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentBranch,
        availableBranches,
        login,
        logout,
        switchBranch,
        isLoginModalOpen,
        setIsLoginModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
