/**
 * A categorical palette distinct enough to tell apart at a glance and legible
 * on both the light and dark cards. New categories/accounts cycle through it
 * instead of all landing on the same grey — that was the bug: AddModal used
 * to hardcode one color for every new row.
 */
export const PALETTE: readonly string[] = [
  '#5B4FE8', // indigo
  '#14B8A6', // teal
  '#F59E0B', // amber
  '#EC4899', // pink
  '#22C55E', // green
  '#3B82F6', // blue
  '#EF4444', // red
  '#A855F7', // purple
  '#84CC16', // lime
  '#06B6D4', // cyan
  '#F97316', // orange
  '#E11D48', // rose
  '#8B5CF6', // violet
  '#10B981', // emerald
  '#D946EF', // fuchsia
  '#0EA5E9', // sky
];

/** The next color in rotation, given how many rows already exist. */
export function suggestedColor(existingCount: number): string {
  return PALETTE[((existingCount % PALETTE.length) + PALETTE.length) % PALETTE.length];
}
