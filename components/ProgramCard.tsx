import type { RankedProgram } from "@/lib/types";

const LABEL_STYLES: Record<RankedProgram["label"], string> = {
  reach: "bg-rose-100 text-rose-700 ring-rose-200",
  match: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  safety: "bg-sky-100 text-sky-700 ring-sky-200",
};

function tuitionLabel(value: number | null): string {
  if (value === null) return "Tuition varies / unknown";
  if (value === 0) return "No tuition fee";
  return `€${value.toLocaleString("en-US")}/year`;
}

export default function ProgramCard({
  item,
  index = 0,
}: {
  item: RankedProgram;
  index?: number;
}) {
  const { program, whyItFits, label, rank } = item;
  const badge = LABEL_STYLES[label] ?? LABEL_STYLES.match;

  return (
    <li
      className="animate-slide rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
            {rank}
          </span>
          <div>
            <h3 className="font-semibold leading-tight text-slate-900">
              {program.name}
            </h3>
            <p className="text-sm text-slate-600">
              {program.university} · {program.city}, {program.country}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${badge}`}
        >
          {label}
        </span>
      </div>

      <p className="mt-3 border-l-2 border-indigo-100 pl-3 text-sm leading-relaxed text-slate-800">
        {whyItFits}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>{program.field}</span>
        <span>·</span>
        <span>{program.durationMonths} months</span>
        <span>·</span>
        <span>{tuitionLabel(program.tuitionEurPerYear)}</span>
        {program.url ? (
          <>
            <span>·</span>
            <a
              href={program.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
            >
              Program page ↗
            </a>
          </>
        ) : null}
      </div>
    </li>
  );
}
