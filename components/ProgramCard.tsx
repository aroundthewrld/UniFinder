import type { Recommendation } from "@/lib/types";

const LABEL_STYLES: Record<Recommendation["label"], string> = {
  reach: "bg-rose-100 text-rose-700 ring-rose-200",
  match: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  safety: "bg-sky-100 text-sky-700 ring-sky-200",
};

// Build a Google search link so users can quickly verify and find the official page.
function searchUrl(rec: Recommendation): string {
  const q = `${rec.name} ${rec.university}`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export default function ProgramCard({
  item,
  index = 0,
}: {
  item: Recommendation;
  index?: number;
}) {
  const { whyItFits, label, rank } = item;
  const badge = LABEL_STYLES[label] ?? LABEL_STYLES.match;
  const location = [item.city, item.country].filter(Boolean).join(", ");

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
              {item.name}
            </h3>
            <p className="text-sm text-slate-600">
              {item.university}
              {location ? ` · ${location}` : ""}
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
        {item.field ? <span>{item.field}</span> : null}
        {item.durationMonths ? (
          <>
            <span>·</span>
            <span>{item.durationMonths} months</span>
          </>
        ) : null}
        {item.tuitionNote ? (
          <>
            <span>·</span>
            <span>{item.tuitionNote}</span>
          </>
        ) : null}
        <span>·</span>
        <a
          href={searchUrl(item)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
        >
          Find official page ↗
        </a>
      </div>
    </li>
  );
}
