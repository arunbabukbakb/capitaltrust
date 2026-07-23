import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: any | null;
  token: string | null;
  menus: any[];
  assignedRoles: any[];
  activeRole: any | null;
  companySettings: {
    companyName: string;
    companyLogo: string;
    supportEmail: string;
    supportPhone: string;
    address?: string;
    gstno?: string;
    ismaintanance?: boolean;
    message?: string;
    resumetime?: string;
    paymentStatus?: string;
    amcRecord?: any;
    pricing?: {
      price: number;
      tax: number;
      amc: number;
    };
  } | null;
}

// Attempt to load user and token from localStorage
const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
const token = localStorage.getItem('token');
const activeRole = localStorage.getItem('activeRole') ? JSON.parse(localStorage.getItem('activeRole')!) : null;

const initialState: AuthState = {
  user: user,
  token: token,
  menus: [],
  assignedRoles: user?.assignedRoles || [],
  activeRole: activeRole || user?.assignedRoles?.[0] || null,
  companySettings: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: any; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.assignedRoles = action.payload.user?.assignedRoles || [];
      const defaultRole = action.payload.user?.assignedRoles?.[0] || null;
      state.activeRole = defaultRole;
      // Persist to localStorage
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('token', action.payload.token);
      if (defaultRole) {
        localStorage.setItem('activeRole', JSON.stringify(defaultRole));
      } else {
        localStorage.removeItem('activeRole');
      }
    },
    setActiveRole(state, action: PayloadAction<any>) {
      state.activeRole = action.payload;
      if (action.payload) {
        localStorage.setItem('activeRole', JSON.stringify(action.payload));
      } else {
        localStorage.removeItem('activeRole');
      }
    },
    setMenus(state, action: PayloadAction<any[]>) {
      state.menus = action.payload;
    },
    setCompanySettings(state, action: PayloadAction<any>) {
      state.companySettings = action.payload;
    },
    logOut(state) {
      state.user = null;
      state.token = null;
      state.menus = [];
      state.assignedRoles = [];
      state.activeRole = null;
      // Clear from localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('activeRole');
    },
    updateUser(state, action: PayloadAction<any>) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
    },
  },
});

export const { setCredentials, setActiveRole, setMenus, setCompanySettings, logOut, updateUser } = authSlice.actions;
export default authSlice.reducer;