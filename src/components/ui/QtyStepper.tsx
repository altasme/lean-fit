export function QtyStepper({
  value,
  onChange,
  min = 1,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
}) {
  return (
    <div className="inline-flex items-center rounded-sm border border-lf-gold/40">
      <button
        type="button"
        aria-label="Decrease quantity"
        className="px-4 py-2 font-kicker text-xl text-lf-gold disabled:opacity-30"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className="tabular w-10 text-center font-kicker text-lg">{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        className="px-4 py-2 font-kicker text-xl text-lf-gold"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
