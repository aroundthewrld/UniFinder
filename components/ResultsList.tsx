import type { Recommendation } from "@/lib/types";
import ProgramCard from "./ProgramCard";

export default function ResultsList({
  items,
  message,
  onRestart,
}: {
  items: Recommendation[];
  message?: string;
  onRestart: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="animate-fade rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
          🔍
        </div>
        <h2 className="text-lg font-semibold text-amber-900">
          No programs matched
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-amber-800">
          {message ??
            "We couldn't find programs matching your level, English-taught requirement, and chosen countries."}
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-5 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
        >
          Adjust my answers
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Your top {items.length} {items.length === 1 ? "match" : "matches"}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Ranked best-fit first. Each reason draws on your actual profile.
          </p>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
        >
          Start over
        </button>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span aria-hidden>ℹ️</span>
        <span>
          These programs are <strong>AI-generated suggestions</strong> from the
          model&apos;s knowledge — names, durations, and especially tuition may be
          out of date or inexact. Always confirm details on each
          university&apos;s official page before relying on them.
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((item, i) => (
          <ProgramCard
            key={`${item.university}-${item.name}-${i}`}
            item={item}
            index={i}
          />
        ))}
      </ul>
    </div>
  );
}
