"use client";

import { useState } from "react";

/**
 * A tag/chip entry field. Users type and press Enter (or comma) to add a chip,
 * Backspace on an empty field removes the last one, and suggestion buttons add
 * common values in one click. Produces a clean string[] with no duplicates.
 */
export default function ChipInput({
  values,
  onChange,
  placeholder,
  suggestions = [],
  ariaLabel,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const cleaned = raw.trim().replace(/,+$/, "").trim();
    if (!cleaned) return;
    // Case-insensitive de-dupe.
    if (values.some((v) => v.toLowerCase() === cleaned.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, cleaned]);
    setDraft("");
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      remove(values.length - 1);
    }
  }

  const openSuggestions = suggestions.filter(
    (s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-white p-2.5 shadow-sm transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
        {values.map((value, i) => (
          <span
            key={`${value}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 py-1 pl-3 pr-1.5 text-sm font-medium text-indigo-700"
          >
            {value}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove ${value}`}
              className="flex h-5 w-5 items-center justify-center rounded-md text-indigo-400 transition hover:bg-indigo-100 hover:text-indigo-700"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => add(draft)}
          placeholder={values.length === 0 ? placeholder : "Add another…"}
          aria-label={ariaLabel}
          className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {openSuggestions.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="py-1 text-xs text-slate-400">Quick add:</span>
          {openSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
