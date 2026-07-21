import {
  LayoutDashboard,
  Coins,
  Calculator,
  Users,
  TrendingUp,
  ShieldCheck,
  LucideIcon,
  Shield,
  FileText,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';

export interface NavItem {
  id: string;
  name: string;
  icon: LucideIcon;
  path?: string;
  children?: NavItem[];
}

export const navConfig: NavItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    id: 'expenses',
    name: 'Expenses',
    icon: Receipt,
    path: '/expenses',
  },
  {
    id: 'liquidity',
    name: 'Liquidity Pools',
    icon: Coins,
    children: [
      {
        id: 'collection-types',
        name: 'Collection Type',
        icon: Shield,
        path: '/collection-types',
      },
      {
        id: 'fund-collection',
        name: 'Fund Collection',
        icon: Coins,
        path: '/fund-collection',
      },
      {
        id: 'fund-collection-audit',
        name: 'Collection Summary',
        icon: FileText,
        path: '/fund-collection-audit',
      },
    ],
  },
  {
    id: 'credit',
    name: 'Credit Facilities',
    icon: Calculator,
    children: [
      { id: 'loan-repayment', name: 'My Loans', icon: Calculator, path: '/loan-repayment' },
      { id: 'loan-list', name: 'Loan List', icon: FileText, path: '/loan-list' },
      { id: 'loan-entry', name: 'Loan Request', icon: Users, path: '/loan-entry' },
      { id: 'loan-repayments', name: 'Repayment', icon: ShieldCheck, path: '/loan-repayments' },
    ],
  },
  {
    id: 'users',
    name: 'Users',
    icon: Users,
    children: [
      {
        id: 'role-management',
        name: 'Role Management',
        icon: Shield,
        path: '/roles',
      },
      {
        id: 'user-management',
        name: 'User Management',
        icon: Users,
        path: '/users',
      },
    ],
  },
  {
    id: 'reports',
    name: 'Reports',
    icon: FileSpreadsheet,
    children: [
      {
        id: 'transactions',
        name: 'Transactions',
        icon: Receipt,
        path: '/reports/transactions',
      },
    ],
  },
];