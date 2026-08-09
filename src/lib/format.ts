export function formatPHP(amount: number | null): string {
  if (amount === null) return 'TBD';
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
