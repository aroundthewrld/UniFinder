"use client";

import { useRef, useState } from "react";

const MAX_BYTES = 32 * 1024 * 1024; // 32 MB — matches the API's practical limit.

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Validate a candidate file; return an error string or null if it's fine. */
function validate(file: File): string | null {
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return `"${file.name}" isn't a PDF. Export your CV as a PDF and try again — most editors have File → Save as PDF.`;
  }
  if (file.size === 0) {
    return "That file is empty. Pick the PDF that actually contains your CV.";
  }
  if (file.size > MAX_BYTES) {
    return `That PDF is ${formatSize(file.size)} — the limit is 32 MB. Try exporting a lighter version.`;
  }
  return null;
}

export default function CvDropzone({
  file,
  onFile,
  error,
  onError,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  error: string;
  onError: (message: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function accept(candidate: File | undefined | null) {
    if (!candidate) return;
    const problem = validate(candidate);
    if (problem) {
      onError(problem);
      onFile(null);
      return;
    }
    onError("");
    onFile(candidate);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging
            ? "border-indigo-400 bg-indigo-50"
            : error
              ? "border-rose-300 bg-rose-50/50"
              : file
                ? "border-emerald-300 bg-emerald-50/50"
                : "border-slate-300 bg-white hover:border-indigo-300 hover:bg-slate-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />

        {file ? (
          <>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
              ✓
            </div>
            <p className="font-semibold text-slate-900">{file.name}</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {formatSize(file.size)} · ready to go
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFile(null);
                onError("");
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="mt-3 text-sm font-medium text-slate-500 underline underline-offset-2 hover:text-slate-800"
            >
              Choose a different file
            </button>
          </>
        ) : (
          <>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">
              ⬆
            </div>
            <p className="font-semibold text-slate-900">
              Drop your CV here, or click to browse
            </p>
            <p className="mt-1 text-sm text-slate-500">PDF only · up to 32 MB</p>
          </>
        )}
      </div>

      {error ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span aria-hidden>⚠</span>
          <span>{error}</span>
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          Your CV is sent straight to the AI to read — no third-party parsing, and
          nothing is stored.
        </p>
      )}
    </div>
  );
}
