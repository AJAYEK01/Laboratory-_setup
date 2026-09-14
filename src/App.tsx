import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initializeDatabase } from './db/index';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { NewBooking } from './components/NewBooking';
import { ResultEntry } from './components/ResultEntry';
import { RecordsList } from './components/RecordsList';
import { ReportPrint } from './components/ReportPrint';
import { TestCatalog } from './components/TestCatalog';
import { OwnerDashboard } from './components/OwnerDashboard';
import { LabSettingsModal } from './components/LabSettingsModal';

const LabApp: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('booking');
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);

  const settings = useLiveQuery(() => db.settings.get('lab_profile'), []) || null;

  useEffect(() => {
    initializeDatabase().then(() => {
      setIsDbReady(true);
    });
  }, []);

  // Set default landing tab according to role
  useEffect(() => {
    if (user) {
      if (user.role === 'owner') {
        setActiveTab('dashboard');
      } else {
        setActiveTab('booking');
      }
    }
  }, [user?.role]);

  const handleOrderCreated = (orderId: string, directToResults: boolean) => {
    setTargetOrderId(orderId);
    if (directToResults) {
      setActiveTab('results');
    } else {
      setActiveTab('records');
    }
  };

  const handleSelectOrderForResults = (orderId: string) => {
    setTargetOrderId(orderId);
    setActiveTab('results');
  };

  const handleSelectOrderForPrint = (orderId: string) => {
    setTargetOrderId(orderId);
    setActiveTab('print');
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-3 border-teal-400 border-t-transparent rounded-full animate-spin mb-3"></div>
        <h2 className="text-base font-bold">Initializing Divine Laboratory...</h2>
        <p className="text-xs text-slate-400 mt-1">Securing local offline database storage...</p>
      </div>
    );
  }

  // MANDATORY LOGIN GATE: Only after login the interface is visible
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar 
        currentTab={activeTab} 
        onSelectTab={(tab) => {
          setActiveTab(tab);
        }} 
        settings={settings} 
      />

      <main className="flex-1 pb-12">
        {activeTab === 'booking' && (
          <NewBooking onOrderCreated={handleOrderCreated} />
        )}

        {activeTab === 'results' && (
          <ResultEntry 
            initialOrderId={targetOrderId}
            onPreviewReport={(orderId) => {
              setTargetOrderId(orderId);
              setActiveTab('print');
            }}
            onBackToRecords={() => setActiveTab('records')}
          />
        )}

        {activeTab === 'records' && (
          <RecordsList 
            onSelectOrderForResults={handleSelectOrderForResults}
            onSelectOrderForPrint={handleSelectOrderForPrint}
          />
        )}

        {activeTab === 'print' && targetOrderId && (
          <ReportPrint 
            orderId={targetOrderId} 
            onBack={() => setActiveTab('records')} 
          />
        )}

        {activeTab === 'catalog' && (
          <TestCatalog />
        )}

        {activeTab === 'dashboard' && (
          <OwnerDashboard />
        )}

        {activeTab === 'settings' && (
          <LabSettingsModal />
        )}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LabApp />
    </AuthProvider>
  );
};

export default App;
