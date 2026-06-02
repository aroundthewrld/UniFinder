"use client";

import { useEffect, useState } from "react";

// Mirrors the actual server pipeline so the wait feels honest, not faked.
const STAGES = [
  { icon: "📄", label: "Reading your CV…" },
  { icon: "🧭", label: "Filtering programs by level, language & country…" },
  { icon: "⚖️", label: "Weighing your profile against each program…" },
  { icon: "✍️", label: "Writing your personalized matches…" },
];

export default function LoadingScreen() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    // Advance through stages, holding on the last one until the response lands.
    const id = setInterval(() => {
      setActive((a) => Math.min(a + 1, STAGES.length - 1));
    }, 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="animate-fade rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 sm:p-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="relative mb-5 h-14 w-14">
          <span className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Finding your best-fit programs
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          This usually takes 10–20 seconds. Hang tight.
        </p>
      </div>

      <ol className="mx-auto flex max-w-sm flex-col gap-3">
        {STAGES.map((stage, i) => {
          const done = i < active;
          const isActive = i === active;
          return (
            <li
              key={stage.label}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                isActive
                  ? "border-indigo-200 bg-indigo-50"
                  : done
                    ? "border-emerald-100 bg-emerald-50/50"
                    : "border-slate-100 bg-slate-50/50"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
                  done
                    ? "bg-emerald-500 text-white"
                    : isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 text-slate-400"
                }`}
              >
                {done ? "✓" : stage.icon}
              </span>
              <span
                className={`text-sm font-medium ${
                  isActive
                    ? "text-indigo-900"
                    : done
                      ? "text-emerald-800"
                      : "text-slate-400"
                }`}
              >
                {stage.label}
              </span>
              {isActive ? (
                <span className="ml-auto flex gap-1">
                  <Dot delay="0ms" />
                  <Dot delay="150ms" />
                  <Dot delay="300ms" />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400"
      style={{ animationDelay: delay }}
    />
  );
}
