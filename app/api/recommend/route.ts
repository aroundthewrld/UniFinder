import { NextResponse } from "next/server";
import programsData from "@/data/programs.json";
import { hardFilter } from "@/lib/filter";
import { extractProfile, rankPrograms } from "@/lib/llm";
import type { Program, RankedProgram, StudentProfile } from "@/lib/types";

const programs = programsData as Program[];

// PDF parsing + two LLM calls — give the route room to run.
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

  // --- Validate the upload ---
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
    `[recommend] upload name=${file.name} type=${file.type || "(none)"} ` +
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

  // --- LLM call 1: CV (+ form) -> StudentProfile ---
  const pdfBase64 = bytes.toString("base64");

  let profile: StudentProfile;
  try {
    profile = await extractProfile(pdfBase64, formValues);
  } catch (err) {
    console.error("extractProfile failed:", err);
    return NextResponse.json(
      {
        error:
          "We couldn't read your CV. Make sure it's a valid PDF and try again.",
      },
      { status: 502 }
    );
  }

  // Form answers are authoritative for the hard-constraint fields.
  profile.levelSought = formValues.levelSought;
  profile.countriesOpenTo = formValues.countriesOpenTo;

  // --- Deterministic hard filter (level / language / country) ---
  const candidates = hardFilter(profile, programs);

  if (candidates.length === 0) {
    return NextResponse.json(
      {
        profile,
        recommendations: [],
        message:
          "No programs in the dataset match your level, English-taught requirement, and chosen countries. Try widening your countries or switching the level.",
      },
      { status: 200 }
    );
  }

  // --- LLM call 2: single ranking call over the survivors ---
  let recommendations;
  try {
    recommendations = await rankPrograms(profile, candidates);
  } catch (err) {
    console.error("rankPrograms failed:", err);
    return NextResponse.json(
      { error: "We couldn't rank the programs. Please try again." },
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

  return NextResponse.json({ profile, recommendations: ranked }, { status: 200 });
}
