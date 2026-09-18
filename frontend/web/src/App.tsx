import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AlertToast } from './components/AlertToast';
import { InactivityTimeoutModal } from './components/InactivityTimeoutModal';
import { LandingView } from './features/landing/LandingView';
import { PosView } from './features/pos/PosView';
import { InventoryView } from './features/inventory/InventoryView';
import { ShiftView } from './features/shifts/ShiftView';
import { CustomerView } from './features/customers/CustomerView';
import { ReportView } from './features/reports/ReportView';
import { AuthModalView } from './features/auth/AuthModalView';
import { UserManagementView } from './features/admin/UserManagementView';
import { ExpenseView } from './features/expenses/ExpenseView';
import { ProfileView } from './features/profile/ProfileView';
import { ApiClient } from './lib/api';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('landing');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  const { theme } = useThemeStore();
  const { isAuthenticated, loginAsDemo } = useAuthStore();

  useEffect(() => {
    // Global override to catch all native alert() calls and route to custom Toast UI
    window.alert = (msg?: any) => {
      import('./store/alertStore').then(({ useAlertStore }) => {
        useAlertStore.getState().showToast('info', 'Notice', String(msg || ''));
      });
    };

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      ApiClient.syncOfflineSales();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    ApiClient.syncOfflineSales();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Protected Navigation Guard: If user clicks an operational page while unauthenticated, open Login modal
  const handleTabChange = (tab: string) => {
    if (tab !== 'landing' && !isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    setCurrentTab(tab);
  };

  // If user logs out while on a protected operational page, redirect to Landing page & Login modal
  useEffect(() => {
    if (!isAuthenticated && currentTab !== 'landing') {
      setAuthModalOpen(true);
    }
  }, [isAuthenticated, currentTab]);

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-urbanist transition-colors ${theme}`}>
      {/* Toast Alert Stack & Inactivity Monitor */}
      <AlertToast />
      <InactivityTimeoutModal />

      {/* 1. PUBLIC STANDALONE LANDING PAGE VIEW */}
      {currentTab === 'landing' ? (
        <LandingView
          onEnterApp={(targetTab = 'pos') => handleTabChange(targetTab)}
          onEnterDemo={() => {
            loginAsDemo();
            setCurrentTab('pos');
          }}
          onOpenAuth={() => setAuthModalOpen(true)}
        />
      ) : (
        /* 2. PROTECTED OPERATIONAL APP SHELL (Requires Authentication) */
        isAuthenticated && (
          <div className="h-screen flex flex-col overflow-hidden">
            <Header
              currentTab={currentTab}
              onTabChange={handleTabChange}
              isOnline={isOnline}
              onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              onOpenAuthModal={() => setAuthModalOpen(true)}
            />

            <div className="flex-1 flex overflow-hidden">
              <Sidebar
                currentTab={currentTab}
                onTabChange={handleTabChange}
                isOpenMobile={isMobileMenuOpen}
                onCloseMobile={() => setIsMobileMenuOpen(false)}
              />

              <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
                {currentTab === 'pos' && <PosView />}
                {currentTab === 'inventory' && <InventoryView />}
                {currentTab === 'shifts' && <ShiftView />}
                {currentTab === 'customers' && <CustomerView />}
                {currentTab === 'reports' && <ReportView />}
                {currentTab === 'expenses' && <ExpenseView />}
                {currentTab === 'admin' && <UserManagementView />}
                {currentTab === 'profile' && <ProfileView />}
              </main>
            </div>
          </div>
        )
      )}

      {/* Login & Sign Up Auth Modal */}
      {authModalOpen && (
        <AuthModalView
          onClose={() => {
            setAuthModalOpen(false);
            // If user closes login modal while on a protected tab without authenticating, revert to landing
            if (!isAuthenticated && currentTab !== 'landing') {
              setCurrentTab('landing');
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
