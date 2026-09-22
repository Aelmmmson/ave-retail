import React from 'react';
import { Home, ShoppingCart, Package, Clock, Users, BarChart3, Shield, DollarSign, UserCheck, ChevronRight, Store, ArrowRightLeft, Percent, ShieldCheck, HelpCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  roles?: string[]; // If omitted or empty, visible to all authenticated roles
}

interface NavSection {
  title: string;
  items: NavItem[];
}

import { APP_VERSION } from '../config/version';

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, isOpenMobile, onCloseMobile }) => {
  const { user } = useAuthStore();
  
  const getRoles = (): string[] => {
    if (!user) return ['CASHIER'];
    const roles: string[] = [];
    if (user.role) roles.push(String(user.role).trim().toUpperCase());
    if (Array.isArray(user.roles)) {
      user.roles.forEach((r: any) => roles.push(String(r).trim().toUpperCase()));
    } else if (typeof user.roles === 'string') {
      (user.roles as string).split(',').forEach((r: string) => roles.push(r.trim().toUpperCase()));
    }
    const unique = Array.from(new Set(roles));
    const high = ['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR'];
    unique.sort((a, b) => {
      const idxA = high.indexOf(a);
      const idxB = high.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
    return unique.length > 0 ? unique : ['CASHIER'];
  };

  const userRoles = getRoles();
  const primaryRole = userRoles[0] || 'CASHIER';
  const userPermissions = (user?.permissions || []).map(p => String(p).toLowerCase().trim());

  const hasAccess = (itemId: string, itemRoles?: string[]): boolean => {
    if (itemId === 'landing' || itemId === 'help' || itemId === 'guide') return true;
    // OWNER and ADMIN always have full access to all sections
    if (userRoles.includes('OWNER') || userRoles.includes('ADMIN')) return true;
    // Granular Module Permission Switch override check (e.g., 'expenses', 'inventory', 'customers', 'reports')
    if (userPermissions.includes(itemId.toLowerCase())) return true;
    // Fallback to role check
    if (!itemRoles || itemRoles.length === 0) return true;
    return itemRoles.some(r => userRoles.includes(r.toUpperCase()));
  };

  const sections: NavSection[] = [
    {
      title: 'Sales & Checkout',
      items: [
        { id: 'landing', label: 'Home / Overview', icon: Home },
        { 
          id: 'pos', 
          label: 'POS Checkout', 
          icon: ShoppingCart, 
          badge: 'Live',
          roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'CASHIER'] 
        },
        { 
          id: 'shifts', 
          label: 'Cashier Shifts', 
          icon: Clock, 
          roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'CASHIER'] 
        }
      ]
    },
    {
      title: 'Catalog & Stock',
      items: [
        { 
          id: 'inventory', 
          label: 'Products & Stock', 
          icon: Package, 
          roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'INVENTORY_OFFICER'] 
        },
        {
          id: 'transfers',
          label: 'Warehouse Transfers',
          icon: ArrowRightLeft,
          roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'INVENTORY_OFFICER']
        },
        {
          id: 'discounts',
          label: 'Promos & Discounts',
          icon: Percent,
          badge: 'Engine',
          roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'INVENTORY_OFFICER']
        }
      ]
    },
    {
      title: 'Financials & Customers',
      items: [
        { 
          id: 'customers', 
          label: 'Customer Debt Ledger', 
          icon: Users, 
          roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'CASHIER', 'ACCOUNTANT'] 
        },
        { 
          id: 'expenses', 
          label: 'Store Expenses', 
          icon: DollarSign, 
          roles: ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'] 
        },
        { 
          id: 'reports', 
          label: 'Reports & Analytics', 
          icon: BarChart3, 
          roles: ['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'ACCOUNTANT'] 
        }
      ]
    },
    {
      title: 'My Account & Identity',
      items: [
        { 
          id: 'profile', 
          label: 'My Account Profile', 
          icon: UserCheck 
        }
      ]
    },
    {
      title: 'Business Administration',
      items: [
        { 
          id: 'admin', 
          label: 'Staff & Branch Admin', 
          icon: Shield, 
          badge: 'Admin',
          roles: ['OWNER', 'ADMIN'] 
        },
        {
          id: 'audit',
          label: 'Compliance Audit Logs',
          icon: ShieldCheck,
          badge: 'Logs',
          roles: ['OWNER', 'ADMIN', 'MANAGER']
        }
      ]
    },
    {
      title: 'Support & Documentation',
      items: [
        {
          id: 'help',
          label: 'System Help & Guide',
          icon: HelpCircle,
          badge: 'Guide'
        }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between select-none transition-transform duration-300 shadow-xl md:shadow-none ${
        isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">

          {/* Dynamic Navigation Sections */}
          {sections.map((section, idx) => {
            const visibleItems = section.items.filter(item => hasAccess(item.id, item.roles));
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center justify-between">
                  <span>{section.title}</span>
                </div>

                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id || (item.id === 'help' && currentTab === 'guide');
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25 font-bold translate-x-0.5'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge ? (
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wide shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200/50 dark:border-teal-800/50'
                        }`}>
                          {item.badge}
                        </span>
                      ) : isActive ? (
                        <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer Brand Info */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            <span>Ave Retail System</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">{APP_VERSION}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
