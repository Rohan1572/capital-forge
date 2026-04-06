import type { KeyboardEvent } from "react";

type AllocationSliderProps = Readonly<{
  label: string;
  value: number;
  locked: boolean;
  onChange: (value: number) => void;
  onToggleLock: () => void;
}>;

function clampValue(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 100);
}

export function AllocationSlider({
  label,
  value,
  locked,
  onChange,
  onToggleLock,
}: AllocationSliderProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const step = event.shiftKey ? 10 : 1;

    switch (event.key) {
      case "Home":
        event.preventDefault();
        onChange(0);
        break;
      case "End":
        event.preventDefault();
        onChange(100);
        break;
      case "PageUp":
        event.preventDefault();
        onChange(clampValue(value + 10));
        break;
      case "PageDown":
        event.preventDefault();
        onChange(clampValue(value - 10));
        break;
      case "ArrowUp":
      case "ArrowRight":
        if (event.shiftKey) {
          event.preventDefault();
          onChange(clampValue(value + step));
        }
        break;
      case "ArrowDown":
      case "ArrowLeft":
        if (event.shiftKey) {
          event.preventDefault();
          onChange(clampValue(value - step));
        }
        break;
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-sm font-medium text-zinc-100">{label}</span>
          <p className="mt-1 text-xs text-zinc-400">{locked ? "Locked" : "Adjustable"}</p>
        </div>
        <button
          type="button"
          onClick={onToggleLock}
          aria-pressed={locked}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
            locked
              ? "border-amber-400/50 bg-amber-400/10 text-amber-100"
              : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500"
          }`}
        >
          {locked ? "Unlock" : "Lock"}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          onKeyDown={handleKeyDown}
          aria-label={`${label} allocation slider`}
          className="h-2 w-full cursor-pointer accent-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        />
        <div className="w-24 shrink-0">
          <label className="sr-only" htmlFor={`${label}-allocation`}>
            {label} allocation
          </label>
          <input
            id={`${label}-allocation`}
            type="number"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-right text-sm text-zinc-100 outline-none transition focus-visible:border-amber-400/60 focus-visible:ring-2 focus-visible:ring-amber-300/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>Use the slider or type a value</span>
        <span>{value}%</span>
      </div>
    </section>
  );
}
