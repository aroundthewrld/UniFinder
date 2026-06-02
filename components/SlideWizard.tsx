"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ChipInput from "./ChipInput";
import CvDropzone from "./CvDropzone";

export interface WizardData {
  path: "cv" | "manual" | null;
  file: File | null;
  // Manual-background fields (used when path === "manual", i.e. no CV).
  academicBackground: string;
  skills: string[];
  notableProjects: string;
  levelSought: "bachelor" | "master";
  countries: string[];
  fields: string[];
  maxTuition: string;
  interestsFreeText: string;
  otherConstraints: string;
}

const EMPTY: WizardData = {
  path: null,
  file: null,
  academicBackground: "",
  skills: [],
  notableProjects: "",
  levelSought: "master",
  countries: [],
  fields: [],
  maxTuition: "",
  interestsFreeText: "",
  otherConstraints: "",
};

const COUNTRY_SUGGESTIONS = [
  "Netherlands",
  "Germany",
  "Sweden",
  "Switzerland",
  "Spain",
  "France",
  "Denmark",
  "Italy",
];

const FIELD_SUGGESTIONS = [
  "Business",
  "Psychology",
  "Computer Science",
  "Engineering",
  "Economics",
  "Design",
  "Law",
  "Biology",
];

const SKILL_SUGGESTIONS = [
  "Research",
  "Writing",
  "Data analysis",
  "Public speaking",
  "Languages",
  "Project management",
  "Programming",
  "Statistics",
];

interface Step {
  key: string;
  title?: string;
  subtitle?: string;
  progress?: boolean;
  validate?: () => string;
  render: () => React.ReactNode;
}

export default function SlideWizard({
  onSubmit,
  loading,
}: {
  onSubmit: (data: FormData) => void;
  loading: boolean;
}) {
  const [data, setData] = useState<WizardData>(EMPTY);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");
  const [fileError, setFileError] = useState("");
  const [stepError, setStepError] = useState("");

  const update = useCallback(
    <K extends keyof WizardData>(key: K, value: WizardData[K]) =>
      setData((d) => ({ ...d, [key]: value })),
    []
  );

  // ---- Step definitions ----------------------------------------------------
  // Each step can declare a validate() that returns an error string to block
  // advancing, or "" to allow it.
  const steps = useMemo<Step[]>(
    () => [
      {
        key: "welcome",
        progress: false,
        render: () => (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl text-white shadow-lg shadow-indigo-200">
              🎓
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Program Fit Finder
            </h1>
            <p className="mx-auto mt-3 max-w-md text-slate-600">
              Answer a few quick questions — with or without a CV. We&apos;ll
              surface a short, ranked list of European university programs that
              actually fit you — across any field — each with a reason why and a{" "}
              <span className="font-medium text-rose-600">reach</span> /{" "}
              <span className="font-medium text-emerald-600">match</span> /{" "}
              <span className="font-medium text-sky-600">safety</span> label.
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm text-slate-400">
              Takes about a minute. Nothing is saved.
            </p>
          </div>
        ),
      },
      {
        key: "path",
        title: "Do you have a CV to upload?",
        subtitle: "Either works — a CV is just the fastest way to tell us about you.",
        validate: () =>
          data.path ? "" : "Pick one to continue.",
        render: () => (
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  value: "cv",
                  icon: "📄",
                  label: "Yes, upload my CV",
                  desc: "We read your PDF directly — quickest and most accurate.",
                },
                {
                  value: "manual",
                  icon: "✍️",
                  label: "No, I'll answer questions",
                  desc: "Tell us your background in a few short fields instead.",
                },
              ] as const
            ).map((opt) => {
              const active = data.path === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    update("path", opt.value);
                    setStepError("");
                  }}
                  className={`rounded-2xl border-2 p-5 text-left transition ${
                    active
                      ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                      : "border-slate-200 bg-white hover:border-indigo-300"
                  }`}
                >
                  <div className="mb-2 text-2xl">{opt.icon}</div>
                  <span className="block font-semibold text-slate-900">
                    {opt.label}
                  </span>
                  <p className="mt-1 text-sm text-slate-500">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        ),
      },
      ...(data.path === "cv"
        ? [
            {
              key: "cv",
              title: "Upload your CV",
              subtitle: "We read it directly to understand your background.",
              validate: () =>
                data.file ? "" : "Add your CV as a PDF to continue.",
              render: () => (
                <CvDropzone
                  file={data.file}
                  onFile={(f) => {
                    update("file", f);
                    if (f) setStepError("");
                  }}
                  error={fileError}
                  onError={setFileError}
                />
              ),
            },
          ]
        : []),
      ...(data.path === "manual"
        ? [
            {
              key: "academic",
              title: "Tell us about your studies",
              subtitle:
                "Your degree, field, institution, and rough standing (e.g. GPA or grade).",
              validate: () =>
                data.academicBackground.trim().length >= 10
                  ? ""
                  : "A sentence or two helps a lot — what are you studying, and where?",
              render: () => (
                <div>
                  <textarea
                    value={data.academicBackground}
                    onChange={(e) => {
                      update("academicBackground", e.target.value);
                      setStepError("");
                    }}
                    rows={4}
                    placeholder="e.g. Final-year BA Psychology at the University of Bologna, GPA ~3.6/4. Strong in research methods and statistics; took electives in cognitive science and clinical psychology."
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-base shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              ),
            },
            {
              key: "skills",
              title: "What are your key skills?",
              subtitle: "Languages, tools, methods — whatever's relevant.",
              render: () => (
                <ChipInput
                  values={data.skills}
                  onChange={(next) => update("skills", next)}
                  placeholder="e.g. Python…"
                  suggestions={SKILL_SUGGESTIONS}
                  ariaLabel="Your skills"
                />
              ),
            },
            {
              key: "projects",
              title: "Any notable projects or experience?",
              subtitle:
                "Optional — internships, research, side projects, competitions.",
              render: () => (
                <textarea
                  value={data.notableProjects}
                  onChange={(e) => update("notableProjects", e.target.value)}
                  rows={4}
                  placeholder="e.g. Led a student research project; summer internship at a local NGO; volunteered as a peer tutor; won a national essay competition."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-base shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              ),
            },
          ]
        : []),
      {
        key: "level",
        title: "What level are you applying for?",
        subtitle: "This is enforced exactly — we never mix levels.",
        render: () => (
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  value: "bachelor",
                  label: "Bachelor's",
                  desc: "Undergraduate degree",
                },
                {
                  value: "master",
                  label: "Master's",
                  desc: "Graduate degree",
                },
              ] as const
            ).map((opt) => {
              const active = data.levelSought === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("levelSought", opt.value)}
                  className={`rounded-2xl border-2 p-5 text-left transition ${
                    active
                      ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                      : "border-slate-200 bg-white hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-900">
                      {opt.label}
                    </span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs ${
                        active
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {active ? "✓" : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        ),
      },
      {
        key: "countries",
        title: "Which countries are you open to?",
        subtitle: "Add as many as you like — or skip to consider anywhere.",
        render: () => (
          <ChipInput
            values={data.countries}
            onChange={(next) => update("countries", next)}
            placeholder="Type a country and press Enter…"
            suggestions={COUNTRY_SUGGESTIONS}
            ariaLabel="Countries you are open to"
          />
        ),
      },
      {
        key: "fields",
        title: "What fields interest you?",
        subtitle:
          data.path === "cv"
            ? "We also infer these from your CV — this just sharpens the ranking."
            : "Pick the areas you want to study.",
        render: () => (
          <ChipInput
            values={data.fields}
            onChange={(next) => update("fields", next)}
            placeholder="e.g. Artificial Intelligence…"
            suggestions={FIELD_SUGGESTIONS}
            ariaLabel="Fields of interest"
          />
        ),
      },
      {
        key: "budget",
        title: "Any tuition budget?",
        subtitle: "Used as soft guidance — leave blank for no limit.",
        validate: () => {
          if (data.maxTuition.trim() === "") return "";
          const n = Number(data.maxTuition);
          if (!Number.isFinite(n) || n < 0)
            return "Enter a positive number, or clear the field for no limit.";
          return "";
        },
        render: () => (
          <div>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                €
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={data.maxTuition}
                onChange={(e) => {
                  update("maxTuition", e.target.value);
                  setStepError("");
                }}
                placeholder="No limit"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-20 text-lg shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                / year
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["", "2000", "5000", "10000", "20000"].map((v) => (
                <button
                  key={v || "none"}
                  type="button"
                  onClick={() => {
                    update("maxTuition", v);
                    setStepError("");
                  }}
                  className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                    data.maxTuition === v
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                  }`}
                >
                  {v === "" ? "No limit" : `≤ €${Number(v).toLocaleString()}`}
                </button>
              ))}
            </div>
          </div>
        ),
      },
      {
        key: "interests",
        title: "What are you looking for?",
        subtitle:
          "In your own words. This is where the best matches come from — be specific.",
        render: () => (
          <div>
            <textarea
              value={data.interestsFreeText}
              onChange={(e) => update("interestsFreeText", e.target.value)}
              rows={5}
              placeholder="e.g. I want a research-heavy program in a lively student city, ideally with strong industry ties and a thesis I can do at a company."
              className="w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-base shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-2 text-xs text-slate-400">
              Optional, but a sentence or two noticeably improves your results.
            </p>
          </div>
        ),
      },
      {
        key: "constraints",
        title: "Anything else we should know?",
        subtitle: "Optional — scholarships, cohort size, location preferences…",
        render: () => (
          <input
            type="text"
            value={data.otherConstraints}
            onChange={(e) => update("otherConstraints", e.target.value)}
            placeholder="e.g. needs scholarships, prefers smaller cohorts"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        ),
      },
      {
        key: "review",
        title: "Ready to find your matches?",
        subtitle: "Here's a quick recap — edit any step by going back.",
        render: () => (
          <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {data.path === "cv" ? (
              <Row label="CV" value={data.file?.name ?? "—"} />
            ) : (
              <>
                <Row
                  label="Background"
                  value={data.academicBackground.trim() || "—"}
                />
                <Row
                  label="Skills"
                  value={data.skills.length ? data.skills.join(", ") : "—"}
                />
                <Row
                  label="Projects"
                  value={data.notableProjects.trim() || "—"}
                />
              </>
            )}
            <Row
              label="Level"
              value={
                data.levelSought === "master" ? "Master's" : "Bachelor's"
              }
            />
            <Row
              label="Countries"
              value={
                data.countries.length ? data.countries.join(", ") : "Any country"
              }
            />
            <Row
              label="Fields"
              value={
                data.fields.length
                  ? data.fields.join(", ")
                  : data.path === "cv"
                    ? "Inferred from CV"
                    : "—"
              }
            />
            <Row
              label="Max tuition"
              value={
                data.maxTuition.trim()
                  ? `€${Number(data.maxTuition).toLocaleString()}/year`
                  : "No limit"
              }
            />
            <Row
              label="Looking for"
              value={data.interestsFreeText.trim() || "—"}
            />
            <Row
              label="Other"
              value={data.otherConstraints.trim() || "—"}
            />
          </dl>
        ),
      },
    ],
    [data, fileError, update]
  );

  const total = steps.length;
  const current = steps[step];
  const isLast = step === total - 1;
  const progressSteps = steps.filter((s) => s.progress !== false).length;
  const progressIndex = steps
    .slice(0, step + 1)
    .filter((s) => s.progress !== false).length;

  const goNext = useCallback(() => {
    const err = current.validate?.() ?? "";
    if (err) {
      setStepError(err);
      return;
    }
    setStepError("");
    setDirection("fwd");
    setStep((s) => Math.min(s + 1, total - 1));
  }, [current, total]);

  const goBack = useCallback(() => {
    setStepError("");
    setDirection("back");
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  function submit() {
    const err = current.validate?.() ?? "";
    if (err) {
      setStepError(err);
      return;
    }
    if (data.path === "cv" && !data.file) {
      // Jump back to the CV step if somehow missing.
      setStep(1);
      setFileError("Add your CV as a PDF to continue.");
      return;
    }
    const fd = new FormData();
    fd.set("inputMode", data.path ?? "cv");
    if (data.path === "cv" && data.file) {
      fd.set("cv", data.file);
    } else {
      fd.set("academicBackground", data.academicBackground.trim());
      fd.set("skills", data.skills.join(", "));
      fd.set("notableProjects", data.notableProjects.trim());
    }
    fd.set("levelSought", data.levelSought);
    fd.set("countriesOpenTo", data.countries.join(", "));
    fd.set("fieldsOfInterest", data.fields.join(", "));
    fd.set("maxTuitionEurPerYear", data.maxTuition.trim());
    fd.set("interestsFreeText", data.interestsFreeText.trim());
    fd.set("otherConstraints", data.otherConstraints.trim());
    onSubmit(fd);
  }

  // Enter advances (except inside a textarea, where Enter is a newline).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "Enter" && tag !== "TEXTAREA") {
        e.preventDefault();
        if (isLast) submit();
        else goNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLast, goNext, step, data]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/60 p-6 shadow-xl shadow-slate-200/50 backdrop-blur sm:p-8">
      {/* Progress bar */}
      {current.progress !== false ? (
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-400">
            <span>
              Step {progressIndex} of {progressSteps}
            </span>
            <span>{Math.round((progressIndex / progressSteps) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${(progressIndex / progressSteps) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Slide body — keyed so it re-animates on each step change */}
      <div
        key={current.key}
        className={direction === "fwd" ? "animate-slide" : "animate-slide-back"}
      >
        {current.title ? (
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {current.title}
            </h2>
            {current.subtitle ? (
              <p className="mt-1.5 text-slate-500">{current.subtitle}</p>
            ) : null}
          </div>
        ) : null}

        {current.render()}

        {stepError ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            <span aria-hidden>⚠</span>
            <span>{stepError}</span>
          </p>
        ) : null}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            disabled={loading}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            ← Back
          </button>
        ) : (
          <span />
        )}

        {isLast ? (
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Finding programs…" : "Find my programs ✨"}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {step === 0 ? "Get started" : "Continue"} →
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 px-4 py-3">
      <dt className="w-28 shrink-0 text-sm font-medium text-slate-400">
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}
