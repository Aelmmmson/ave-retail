import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AlertToast } from './components/AlertToast';
import { InactivityTimeoutModal } from './components/InactivityTimeoutModal';
import { ReceiptBuilderModal } from './components/ReceiptBuilderModal';
import { LandingView } from './features/landing/LandingView';
import { PosView } from './features/pos/PosView';
import { InventoryView } from './features/inventory/InventoryView';
import { ShiftView } from './features/shifts/ShiftView';
import { CustomerView } from './features/customers/CustomerView';
import { ReportView } from './features/reports/ReportView';
import { AuthModalView } from './features/auth/AuthModalView';
import { UserManagementView } from './features/admin/UserManagementView';
import { AuditView } from './features/admin/AuditView';
import { HelpView } from './features/help/HelpView';
import { ExpenseView } from './features/expenses/ExpenseView';
import { ProfileView } from './features/profile/ProfileView';
import { WarehouseTransferView } from './features/transfers/WarehouseTransferView';
import { DiscountsView } from './features/discounts/DiscountsView';
import { CustomerFacingDisplay } from './features/customerDisplay/CustomerFacingDisplay';
import { ApiClient } from './lib/api';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';

export const App: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const { isAuthenticated, loginAsDemo } = useAuthStore();
  const rawView = urlParams.get('view');
  const initialView = (rawView === 'guide' ? 'help' : rawView) || (isAuthenticated ? 'pos' : 'landing');

  const [currentTab, setCurrentTab] = useState(initialView);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [receiptBuilderOpen, setReceiptBuilderOpen] = useState(false);
  
  const { theme } = useThemeStore();

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

  const [selectedProductIdToAdjust, setSelectedProductIdToAdjust] = useState<string | null>(null);

  // Protected Navigation Guard: Launch POS on login
  const handleTabChange = (tab: string) => {
    const targetTab = tab === 'guide' ? 'help' : tab;
    if (targetTab !== 'landing' && targetTab !== 'help' && targetTab !== 'customer_display' && !isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    setCurrentTab(targetTab);
  };

  // Launch POS Checkout Register immediately once user logs in
  useEffect(() => {
    if (currentTab === 'customer_display') return;
    if (isAuthenticated) {
      if (currentTab === 'landing' || !currentTab) {
        setCurrentTab('pos');
      }
    } else if (!isAuthenticated && currentTab !== 'landing' && currentTab !== 'help') {
      setAuthModalOpen(true);
    }
  }, [isAuthenticated]);

  // Standalone Customer Facing Display Mode (No Authentication Guard Required)
  if (currentTab === 'customer_display') {
    return <CustomerFacingDisplay />;
  }

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
        /* 2. OPERATIONAL APP SHELL (Requires Authentication OR Public Guide View) */
        (isAuthenticated || currentTab === 'help') && (
          <div className="h-screen flex flex-col overflow-hidden">
            <Header
              currentTab={currentTab}
              onTabChange={handleTabChange}
              isOnline={isOnline}
              onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              onOpenAuthModal={() => setAuthModalOpen(true)}
              onOpenProductAdjustment={(prodId) => {
                setSelectedProductIdToAdjust(prodId);
                setCurrentTab('inventory');
              }}
              onOpenReceiptBuilder={() => setReceiptBuilderOpen(true)}
            />

            <div className="flex-1 flex overflow-hidden">
              {isAuthenticated && (
                <Sidebar
                  currentTab={currentTab}
                  onTabChange={handleTabChange}
                  isOpenMobile={isMobileMenuOpen}
                  onCloseMobile={() => setIsMobileMenuOpen(false)}
                />
              )}

              <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
                {currentTab === 'pos' && <PosView />}
                {currentTab === 'inventory' && (
                  <InventoryView
                    selectedProductIdToAdjust={selectedProductIdToAdjust}
                    onClearSelectedProductToAdjust={() => setSelectedProductIdToAdjust(null)}
                  />
                )}
                {currentTab === 'transfers' && <WarehouseTransferView />}
                {currentTab === 'discounts' && <DiscountsView />}
                {currentTab === 'shifts' && <ShiftView />}
                {currentTab === 'customers' && <CustomerView />}
                {currentTab === 'reports' && <ReportView />}
                {currentTab === 'expenses' && <ExpenseView />}
                {currentTab === 'admin' && <UserManagementView />}
                {currentTab === 'audit' && <AuditView />}
                {(currentTab === 'help' || currentTab === 'guide') && <HelpView />}
                {currentTab === 'profile' && <ProfileView />}
              </main>
            </div>
          </div>
        )
      )}

      {/* Thermal Receipt Builder Modal */}
      <ReceiptBuilderModal
        isOpen={receiptBuilderOpen}
        onClose={() => setReceiptBuilderOpen(false)}
      />

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
