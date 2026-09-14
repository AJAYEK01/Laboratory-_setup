import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initializeDatabase } from './db/index';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { NewBooking } from './components/NewBooking';
import { ResultEntry } from './components/ResultEntry';
import { RecordsList } from './components/RecordsList';
import { ReportPrint } from './components/ReportPrint';
import { TestCatalog } from './components/TestCatalog';
import { OwnerDashboard } from './components/OwnerDashboard';
import { LabSettingsModal } from './components/LabSettingsModal';

const LabApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('booking');
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);

  const settings = useLiveQuery(() => db.settings.get('lab_profile'), []) || null;

  useEffect(() => {
    initializeDatabase().then(() => {
      setIsDbReady(true);
    });
  }, []);

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
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-bold">Initializing Village LabPulse...</h2>
        <p className="text-xs text-slate-400 mt-1">Securing persistent local database storage...</p>
      </div>
    );
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

      <LoginModal />

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
