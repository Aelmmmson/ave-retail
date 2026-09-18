import { create } from 'zustand';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  branchId?: string;
  organizationId?: string;
  organizationName?: string;
  tagline?: string;
  taxNumber?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  establishedDate?: string;
  createdAt?: string;
  status?: string;
}

export interface BranchItem {
  id: string;
  name: string;
  code: string;
  phone?: string;
  address?: string;
  status?: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  currentBranch: BranchItem | null;
  branches: BranchItem[];

  login: (user: UserProfile, token: string, branches?: BranchItem[]) => void;
  loginAsDemo: () => void;
  logout: () => void;
  switchBranch: (branch: BranchItem) => void;
  setBranches: (branches: BranchItem[]) => void;
  updateUser: (updatedFields: Partial<UserProfile>) => void;
}

const savedUser = localStorage.getItem('ave_user');
const savedToken = localStorage.getItem('ave_token');

export const useAuthStore = create<AuthState>((set, get) => ({
  user: savedUser ? JSON.parse(savedUser) : null,
  token: savedToken || null,
  isAuthenticated: !!(savedUser && savedToken),
  currentBranch: { id: 'ACC-01', name: 'Accra Central Branch', code: 'ACC-01' },
  branches: [
    { id: 'ACC-01', name: 'Accra Central Branch', code: 'ACC-01' },
    { id: 'KUM-01', name: 'Kumasi Mall Branch', code: 'KUM-01' },
    { id: 'TAK-01', name: 'Takoradi Harbor Branch', code: 'TAK-01' }
  ],

  login: (user, token, branches = []) => {
    localStorage.setItem('ave_user', JSON.stringify(user));
    localStorage.setItem('ave_token', token);
    const initialBranch = branches.length > 0 ? branches[0] : { id: user.branchId || 'ACC-01', name: 'Main Branch', code: 'MAIN' };
    set({
      user,
      token,
      isAuthenticated: true,
      currentBranch: initialBranch,
      branches: branches.length > 0 ? branches : get().branches
    });
  },

  loginAsDemo: () => {
    const demoUser: UserProfile = {
      id: 'demo-user-01',
      name: 'Ebenezer Mensah (Demo Admin)',
      email: 'admin@ave.com',
      role: 'OWNER',
      roles: ['OWNER', 'ADMIN', 'CASHIER'],
      permissions: ['pos', 'shifts', 'inventory', 'customers', 'expenses', 'reports', 'admin'],
      organizationId: 'AVE-ORG-01',
      organizationName: 'Ave Retail Enterprise Ltd',
      tagline: 'Everyday Quality Retail',
      taxNumber: 'TIN-GH-9988776655',
      phone: '+233 24 000 1122',
      address: 'Oxford Street, Osu, Accra',
      establishedDate: '2020-01-15',
      status: 'ACTIVE'
    };
    get().login(demoUser, 'jwt-token-demo-123');
  },

  logout: () => {
    localStorage.removeItem('ave_user');
    localStorage.removeItem('ave_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  switchBranch: (branch) => {
    set({ currentBranch: branch });
  },

  setBranches: (branches) => set({ branches }),

  updateUser: (updatedFields) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const merged = { ...currentUser, ...updatedFields };
    localStorage.setItem('ave_user', JSON.stringify(merged));
    set({ user: merged });
  }
}));
