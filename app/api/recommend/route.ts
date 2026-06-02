import { NextResponse } from "next/server";
import programsData from "@/data/programs.json";
import { hardFilter } from "@/lib/filter";
import { recommendFromCv } from "@/lib/llm";
import type { Program, RankedProgram } from "@/lib/types";

const programs = programsData as Program[];

// One LLM call over a PDF — give the route room to run.
export const maxDuration = 60;

function parseList(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseNullableNumber(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function asString(raw: FormDataEntryValue | null): string {
  return typeof raw === "string" ? raw : "";
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not read the form submission." },
      { status: 400 }
    );
  }

  const inputMode = form.get("inputMode") === "manual" ? "manual" : "cv";

  // --- Background source: validate the PDF (cv mode) or the typed fields (manual) ---
  let pdfBase64: string | undefined;
  let manualBackground:
    | { academicBackground: string; skills: string[]; notableProjects: string }
    | undefined;

  if (inputMode === "cv") {
    const file = form.get("cv");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Please attach a CV as a PDF file." },
        { status: 400 }
      );
    }

    // Read the bytes up front so we can validate by content, not by the
    // browser-reported MIME type (Windows often reports an empty or wrong type).
    let bytes: Buffer;
    try {
      bytes = Buffer.from(await file.arrayBuffer());
    } catch {
      return NextResponse.json(
        { error: "Could not read the uploaded file." },
        { status: 400 }
      );
    }

    // A real PDF starts with "%PDF-" (allowing a few junk bytes some tools prepend).
    const header = bytes.subarray(0, 1024).toString("latin1");
    const looksLikePdf = header.includes("%PDF-");
    console.log(
      `[recommend] cv upload name=${file.name} type=${file.type || "(none)"} ` +
        `size=${file.size} looksLikePdf=${looksLikePdf}`
    );

    if (!looksLikePdf) {
      return NextResponse.json(
        {
          error:
            "That file doesn't look like a PDF. Please export your CV as a PDF and upload that.",
        },
        { status: 400 }
      );
    }

    pdfBase64 = bytes.toString("base64");
  } else {
    const academicBackground = asString(form.get("academicBackground")).trim();
    if (academicBackground.length < 10) {
      return NextResponse.json(
        {
          error:
            "Tell us a little about your studies (your degree, field, and institution) so we can match you.",
        },
        { status: 400 }
      );
    }
    manualBackground = {
      academicBackground,
      skills: parseList(form.get("skills")),
      notableProjects: asString(form.get("notableProjects")).trim(),
    };
    console.log(
      `[recommend] manual background chars=${academicBackground.length} ` +
        `skills=${manualBackground.skills.length}`
    );
  }

  const levelRaw = form.get("levelSought");
  const levelSought: "bachelor" | "master" =
    levelRaw === "bachelor" ? "bachelor" : "master";

  const formValues = {
    levelSought,
    countriesOpenTo: parseList(form.get("countriesOpenTo")),
    fieldsOfInterest: parseList(form.get("fieldsOfInterest")),
    maxTuitionEurPerYear: parseNullableNumber(form.get("maxTuitionEurPerYear")),
    interestsFreeText: asString(form.get("interestsFreeText")),
    otherConstraints: asString(form.get("otherConstraints")),
  };

  // --- Deterministic hard filter (level / language / country) ---
  // Runs first, on the form answers only — so we send the model just the
  // candidates it's allowed to choose from.
  const candidates = hardFilter(
    {
      levelSought: formValues.levelSought,
      countriesOpenTo: formValues.countriesOpenTo,
    },
    programs
  );

  if (candidates.length === 0) {
    return NextResponse.json(
      {
        recommendations: [],
        message:
          "No programs in the dataset match your level, English-taught requirement, and chosen countries. Try widening your countries or switching the level.",
      },
      { status: 200 }
    );
  }

  // --- Single LLM call: background (PDF or typed) + form + candidates -> ranked ---
  let recommendations;
  try {
    recommendations = await recommendFromCv({
      pdfBase64,
      manualBackground,
      formValues,
      candidates,
    });
  } catch (err) {
    console.error("recommendFromCv failed:", err);
    return NextResponse.json(
      {
        error:
          "We couldn't generate recommendations. Please try again in a moment.",
      },
      { status: 502 }
    );
  }

  // Join each recommendation with its full program record for rendering.
  const byId = new Map(candidates.map((p) => [p.id, p]));
  const ranked: RankedProgram[] = recommendations
    .map((r) => {
      const program = byId.get(r.programId);
      return program ? { ...r, program } : null;
    })
    .filter((x): x is RankedProgram => x !== null);

  return NextResponse.json({ recommendations: ranked }, { status: 200 });
}
