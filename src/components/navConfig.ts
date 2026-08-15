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
  Calendar,
  CalendarDays,
  Tag,
  CheckSquare,
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
    id: 'meetings-parent',
    name: 'Meetings',
    icon: CalendarDays,
    children: [
      {
        id: 'meeting-list',
        name: 'Meeting List',
        icon: Calendar,
        path: '/meetings',
      },
      {
        id: 'meeting-types',
        name: 'Meeting Type',
        icon: Tag,
        path: '/meeting-types',
      },
      {
        id: 'meeting-statuses',
        name: 'Meeting Status',
        icon: CheckSquare,
        path: '/meeting-statuses',
      },
    ],
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
      {
        id: 'member-ledger',
        name: 'Member Ledger',
        icon: FileText,
        path: '/reports/member-ledger',
      },
      {
        id: 'due-report',
        name: 'Due Report',
        icon: Calendar,
        path: '/reports/due-report',
      },
    ],
  },
];