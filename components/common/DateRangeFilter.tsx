"use client";

export type DateRangePreset = "all" | "7" | "30" | "custom";

export interface DateRangeValue {
  preset: DateRangePreset;
  from: string;
  to: string;
}

export const DATE_RANGE_DEFAULT: DateRangeValue = { preset: "all", from: "", to: "" };

interface Props {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  /** Total count to show "N of M" indicator. Pass undefined to hide it. */
  totalCount?: number;
  /** Filtered count shown alongside totalCount */
  filteredCount?: number;
}

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: "all", label: "All" },
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "custom", label: "Custom" },
];

export function DateRangeFilter({ value, onChange, totalCount, filteredCount }: Props) {
  const setPreset = (key: DateRangePreset) =>
    onChange(key === "custom" ? { preset: "custom", from: value.from, to: value.to } : { preset: key, from: "", to: "" });

  return (
    <div className="ref-date-bar">
      <span className="ref-date-bar__label">Period</span>
      <div className="date-preset-row">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            className={"date-preset-btn" + (value.preset === key ? " active" : "")}
            onClick={() => setPreset(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {value.preset === "custom" && (
        <>
          <input
            type="date"
            value={value.from}
            onChange={e => onChange({ ...value, from: e.target.value })}
            style={{ fontSize: 12, padding: "3px 6px", width: "auto", borderRadius: 8 }}
            title="From"
          />
          <span className="hint" style={{ fontSize: 12 }}>–</span>
          <input
            type="date"
            value={value.to}
            onChange={e => onChange({ ...value, to: e.target.value })}
            style={{ fontSize: 12, padding: "3px 6px", width: "auto", borderRadius: 8 }}
            title="To"
          />
        </>
      )}
      {totalCount !== undefined && filteredCount !== undefined && value.preset !== "all" && (
        <span className="hint" style={{ fontSize: 11, marginLeft: "auto" }}>
          {filteredCount} of {totalCount}
        </span>
      )}
    </div>
  );
}

/** Apply a DateRangeValue to a date string (YYYY-MM-DD). Returns true if the date passes the filter. */
export function datePassesFilter(raw: string | null | undefined, filter: DateRangeValue): boolean {
  const d = raw || "";
  if (filter.preset === "all") return true;
  if (filter.preset === "custom") {
    if (filter.from && d < filter.from) return false;
    if (filter.to && d > filter.to) return false;
    return true;
  }
  const days = Number(filter.preset);
  const cutoff = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  return d >= cutoff;
}
