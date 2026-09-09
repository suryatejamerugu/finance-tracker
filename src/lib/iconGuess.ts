import type { AccountType } from '../types';

/**
 * Best-guess defaults from a name, used two places: the v5 migration (every
 * existing row needs a type/icon retroactively, and re-asking isn't
 * reasonable for someone with years of data) and live in AddModal/
 * IncomeCategoriesModal as you type a name, so the common case needs no
 * picker interaction at all — just an override if the guess is wrong.
 */
export function guessAccountType(name: string): AccountType {
  const n = name.toLowerCase();
  if (/\bnre\b/.test(n)) return 'nre';
  if (/\bnro\b/.test(n)) return 'nro';
  if (/credit/.test(n)) return 'credit_card';
  if (/saving/.test(n)) return 'savings';
  if (/check/.test(n)) return 'checking';
  if (/loan|mortgage/.test(n)) return 'loan';
  if (/invest|brokerage|401k|ira|stock|mutual fund/.test(n)) return 'investment';
  if (/cash|wallet/.test(n)) return 'cash';
  return 'other';
}

export function guessCategoryIcon(name: string): string {
  const n = name.toLowerCase();
  if (/grocer/.test(n)) return 'cart';
  if (/dining|coffee|restaurant|food/.test(n)) return 'coffee';
  if (/bill|utilit/.test(n)) return 'receipt';
  if (/transport|fuel|gas|\bcar\b/.test(n)) return 'car';
  if (/health|medical|self.?care/.test(n)) return 'heart-pulse';
  if (/entertain|shopping/.test(n)) return 'film';
  if (/emergency/.test(n)) return 'shield-alert';
  if (/travel/.test(n)) return 'plane';
  if (/invest/.test(n)) return 'trending-up';
  if (/educat|learn|tuition|school/.test(n)) return 'graduation-cap';
  if (/subscription/.test(n)) return 'repeat';
  if (/rent|home|mortgage/.test(n)) return 'home';
  if (/insurance/.test(n)) return 'shield-check';
  if (/gift/.test(n)) return 'gift';
  if (/kid|family|child/.test(n)) return 'users';
  if (/fitness|gym/.test(n)) return 'dumbbell';
  if (/phone|internet|mobile/.test(n)) return 'smartphone';
  if (/charity|donat/.test(n)) return 'heart-handshake';
  if (/tax/.test(n)) return 'landmark';
  return 'tag';
}

export function guessIncomeIcon(name: string): string {
  const n = name.toLowerCase();
  if (/salary|paycheck|wage/.test(n)) return 'briefcase';
  if (/transfer/.test(n)) return 'arrow-left-right';
  if (/debt/.test(n)) return 'hand-coins';
  if (/reward/.test(n)) return 'award';
  if (/refund|return/.test(n)) return 'undo';
  if (/dividend/.test(n)) return 'trending-up';
  if (/limit/.test(n)) return 'credit-card';
  if (/splitwise|split/.test(n)) return 'users';
  if (/freelance|contract/.test(n)) return 'laptop';
  if (/interest/.test(n)) return 'percent';
  return 'tag';
}
