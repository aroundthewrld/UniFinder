"use client";

import { useEffect, useRef, useState } from "react";
import SlideWizard from "@/components/SlideWizard";
import ResultsList from "@/components/ResultsList";
import LoadingScreen from "@/components/LoadingScreen";
import type { RankedProgram } from "@/lib/types";

type Phase = "form" | "loading" | "results" | "error";

interface FriendlyError {
  title: string;
  detail: string;
  canRetry: boolean;
}

/** Turn an HTTP status + server message into something a human can act on. */
function explainError(status: number, serverMsg?: string): FriendlyError {
  if (status === 0) {
    return {
      title: "Couldn't reach the server",
      detail:
        "The request didn't get through. Check that the dev server is still running, then try again.",
      canRetry: true,
    };
  }
  if (status === 400) {
    return {
      title: "Something was off with your submission",
      detail:
        serverMsg ??
        "Your CV or one of your answers couldn't be read. Go back and check the PDF, then resubmit.",
      canRetry: true,
    };
  }
  if (status === 413) {
    return {
      title: "That PDF is too large",
      detail: "Export a lighter version of your CV (under 32 MB) and try again.",
      canRetry: true,
    };
  }
  if (status === 429) {
    return {
      title: "Too many requests right now",
      detail:
        "The AI service is rate-limiting us. Wait a few seconds and try again.",
      canRetry: true,
    };
  }
  if (status === 502 || status === 503) {
    return {
      title: "The AI couldn't complete the request",
      detail:
        serverMsg ??
        "This is usually temporary — the model may have been busy or returned an unexpected response. Please try again.",
      canRetry: true,
    };
  }
  return {
    title: "Something went wrong",
    detail: serverMsg ?? "An unexpected error occurred. Please try again.",
    canRetry: true,
  };
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("form");
  const [results, setResults] = useState<RankedProgram[]>([]);
  const [emptyMessage, setEmptyMessage] = useState("");
  const [error, setError] = useState<FriendlyError | null>(null);
  const lastSubmission = useRef<FormData | null>(null);

  async function runRecommendation(data: FormData) {
    lastSubmission.current = data;
    setPhase("loading");
    setError(null);

    try {
      const res = await fetch("/api/recommend", { method: "POST", body: data });

      let json: {
        recommendations?: RankedProgram[];
        message?: string;
        error?: string;
      } = {};
      try {
        json = await res.json();
      } catch {
        /* non-JSON response — handled by status below */
      }

      if (!res.ok) {
        setError(explainError(res.status, json.error));
        setPhase("error");
        return;
      }

      setResults(json.recommendations ?? []);
      setEmptyMessage(json.message ?? "");
      setPhase("results");
    } catch {
      setError(explainError(0));
      setPhase("error");
    }
  }

  function restart() {
    setPhase("form");
    setResults([]);
    setEmptyMessage("");
    setError(null);
  }

  function retry() {
    if (lastSubmission.current) runRecommendation(lastSubmission.current);
    else restart();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10 sm:py-16">
      {phase === "form" ? (
        <SlideWizard onSubmit={runRecommendation} loading={false} />
      ) : null}

      {phase === "loading" ? <LoadingScreen /> : null}

      {phase === "results" ? (
        <ResultsList
          items={results}
          message={emptyMessage}
          onRestart={restart}
        />
      ) : null}

      {phase === "error" && error ? (
        <ErrorScreen error={error} onRetry={retry} onRestart={restart} />
      ) : null}

      <footer className="mt-8 text-center text-xs text-slate-400">
        Recommendations are AI-generated guidance, not admissions advice. Always
        verify details on the official program page.
      </footer>
    </main>
  );
}

function ErrorScreen({
  error,
  onRetry,
  onRestart,
}: {
  error: FriendlyError;
  onRetry: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="animate-fade rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl shadow-rose-100/40">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-3xl">
        ⚠
      </div>
      <h2 className="text-xl font-bold text-slate-900">{error.title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        {error.detail}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        {error.canRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500"
          >
            Try again
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
