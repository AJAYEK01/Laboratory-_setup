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
      // Offline fallback authentication for local staff
      if (username === 'owner' && password === 'Owner@2026!') {
        const ownerUser: AuthUser = {
          id: 'user-owner',
          username: 'owner',
          fullName: 'Dr. Anand M. Patel (Director / Owner)',
          role: 'owner',
          branchId: null,
        };
        setUser(ownerUser);
        setToken('offline-demo-token-owner');
        localStorage.setItem('lab_auth_token', 'offline-demo-token-owner');
        localStorage.setItem('lab_auth_user', JSON.stringify(ownerUser));
        setIsLoginModalOpen(false);
        return { success: true };
      } else if (username === 'tech_rampur' && password === 'Tech@123!') {
        const branch = defaultBranches[0];
        const techUser: AuthUser = {
          id: 'user-tech-rampur',
          username: 'tech_rampur',
          fullName: 'Rameshwar Verma (Lab Tech - Rampur)',
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
      } else if (username === 'tech_tehsil' && password === 'Tech@123!') {
        const branch = defaultBranches[1];
        const techUser: AuthUser = {
          id: 'user-tech-tehsil',
          username: 'tech_tehsil',
          fullName: 'Suresh Kumar (Lab Tech - Tehsil HQ)',
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

      return { success: false, message: 'Server is offline or credentials invalid.' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lab_auth_token');
    localStorage.removeItem('lab_auth_user');
  };

  const switchBranch = (branchId: string) => {
    // Only owner or unauthenticated user can switch branches freely
    if (user && user.role !== 'owner' && user.branchId && user.branchId !== branchId) {
      alert('Branch technicians can only access their assigned branch.');
      return;
    }

    const branch = availableBranches.find(b => b.id === branchId);
    if (branch) {
      setCurrentBranch(branch);
      localStorage.setItem('lab_current_branch', JSON.stringify(branch));
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
