type AllocationSliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

export function AllocationSlider({ label, value, onChange }: AllocationSliderProps) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="text-sm text-zinc-300">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="text-xs text-zinc-400">{value}%</span>
    </label>
  );
}
