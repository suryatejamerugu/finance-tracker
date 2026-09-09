import {
  ArrowLeftRight,
  Award,
  Banknote,
  Briefcase,
  Car,
  Coffee,
  CreditCard,
  Dumbbell,
  Film,
  Gift,
  Globe,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Percent,
  PiggyBank,
  Plane,
  Repeat,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Tag,
  TrendingUp,
  Undo2,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { AccountType } from '../types';

/**
 * Account types are a bounded list — each gets exactly one fixed icon, since
 * "credit card" already tells you what icon to expect. Categories and income
 * categories are free-text instead, so those get an open picker (ICON_OPTIONS
 * below) and store the chosen icon as a string key rather than a component
 * reference, so swapping the icon library later doesn't need a migration.
 */
export const ACCOUNT_TYPES: Array<{ value: AccountType; label: string; icon: LucideIcon }> = [
  { value: 'checking', label: 'Checking', icon: Wallet },
  { value: 'savings', label: 'Savings', icon: PiggyBank },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'nro', label: 'NRO', icon: Landmark },
  { value: 'nre', label: 'NRE', icon: Globe },
  { value: 'loan', label: 'Loan', icon: HandCoins },
  { value: 'investment', label: 'Investment', icon: TrendingUp },
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'other', label: 'Other', icon: Wallet },
];

const ACCOUNT_TYPE_BY_VALUE = new Map(ACCOUNT_TYPES.map((t) => [t.value, t]));

export function accountTypeMeta(type: string): { value: AccountType; label: string; icon: LucideIcon } {
  return ACCOUNT_TYPE_BY_VALUE.get(type as AccountType) ?? ACCOUNT_TYPES[ACCOUNT_TYPES.length - 1];
}

/** The curated set categories and income categories pick from — covers common personal-finance concepts, plus a "tag" fallback for anything else. */
export const ICON_OPTIONS: Array<{ key: string; label: string; icon: LucideIcon }> = [
  { key: 'cart', label: 'Groceries', icon: ShoppingCart },
  { key: 'coffee', label: 'Dining', icon: Coffee },
  { key: 'receipt', label: 'Bills', icon: Receipt },
  { key: 'car', label: 'Transport', icon: Car },
  { key: 'heart-pulse', label: 'Health', icon: HeartPulse },
  { key: 'film', label: 'Entertainment', icon: Film },
  { key: 'shield-alert', label: 'Emergency', icon: ShieldAlert },
  { key: 'plane', label: 'Travel', icon: Plane },
  { key: 'trending-up', label: 'Investment', icon: TrendingUp },
  { key: 'graduation-cap', label: 'Education', icon: GraduationCap },
  { key: 'repeat', label: 'Subscriptions', icon: Repeat },
  { key: 'home', label: 'Home/Rent', icon: Home },
  { key: 'shield-check', label: 'Insurance', icon: ShieldCheck },
  { key: 'gift', label: 'Gifts', icon: Gift },
  { key: 'users', label: 'Family', icon: Users },
  { key: 'dumbbell', label: 'Fitness', icon: Dumbbell },
  { key: 'smartphone', label: 'Phone/Internet', icon: Smartphone },
  { key: 'heart-handshake', label: 'Charity', icon: HeartHandshake },
  { key: 'briefcase', label: 'Salary/Work', icon: Briefcase },
  { key: 'arrow-left-right', label: 'Transfer', icon: ArrowLeftRight },
  { key: 'credit-card', label: 'Credit', icon: CreditCard },
  { key: 'hand-coins', label: 'Debt', icon: HandCoins },
  { key: 'award', label: 'Rewards', icon: Award },
  { key: 'undo', label: 'Refund', icon: Undo2 },
  { key: 'percent', label: 'Interest', icon: Percent },
  { key: 'laptop', label: 'Freelance', icon: Laptop },
  { key: 'landmark', label: 'Bank/Tax', icon: Landmark },
  { key: 'tag', label: 'Other', icon: Tag },
];

const ICON_BY_KEY = new Map(ICON_OPTIONS.map((o) => [o.key, o.icon]));

export function iconFor(key: string): LucideIcon {
  return ICON_BY_KEY.get(key) ?? Tag;
}

/** A small tinted-circle badge — the "logo" look for an account type or category, using its own color rather than one fixed brand color. */
export function IconBadge({
  icon: Icon,
  color,
  size = 26,
}: {
  icon: LucideIcon;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: `${color}26`, color }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.56)} strokeWidth={2} />
    </span>
  );
}
