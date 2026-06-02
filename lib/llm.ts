import Anthropic from "@anthropic-ai/sdk";
import type { Program, Recommendation, StudentProfile } from "./types";

// Default model: multimodal, reads PDFs natively, good cost/quality balance.
// Swap to an Opus model only if ranking quality demands it.
const MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key."
    );
  }
  // Reuse a single client across requests.
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

/**
 * Pull the first JSON value (object or array) out of a model response and parse
 * it defensively. Handles stray ```json fences and leading/trailing prose.
 */
function parseJsonLoose<T>(raw: string): T {
  let text = raw.trim();

  // Strip a leading ```json / ``` fence and the trailing ``` if present.
  text = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(text) as T;
  } catch {
    // Fall back to grabbing the outermost { … } or [ … ] block.
    const start = text.search(/[[{]/);
    const lastBrace = text.lastIndexOf("}");
    const lastBracket = text.lastIndexOf("]");
    const end = Math.max(lastBrace, lastBracket);
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T;
    }
    throw new Error("Model did not return valid JSON.");
  }
}

/** Concatenate all text blocks from a message response. */
function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

const PROFILE_SYSTEM = `You extract a structured student profile for university-program matching.
You are given a CV (PDF) and form answers. Return ONLY a JSON object (no prose, no markdown fences) matching this TypeScript type:

{
  "levelSought": "bachelor" | "master",
  "countriesOpenTo": string[],        // empty array = open to any
  "fieldsOfInterest": string[],
  "academicBackground": string,       // degree, field, rough standing, institution
  "skills": string[],
  "notableProjects": string,          // free text
  "constraints": { "maxTuitionEurPerYear": number | null, "other": string },
  "interestsFreeText": string
}

Infer fields of interest from coursework, projects, and stated interests. If a field is unknown, use an empty array/string or null — never invent credentials, grades, or experience the CV doesn't support. The form answers are authoritative for levelSought, countriesOpenTo, maxTuitionEurPerYear, and the student's own interest text.`;

const RANK_SYSTEM = `You are an expert study-abroad advisor. Given a student profile and a list of candidate programs (already pre-filtered to match level, language, and country), select and rank the ~10 best fits.

For each chosen program write a single-sentence "whyItFits" that references the student's SPECIFIC background or interests — not generic filler — and draws on that program's distinctiveNote. Good: "Their distributed-systems coursework and your kernel project line up with this lab's focus on edge computing." Bad: "This program matches your interest in CS."

Assign a label:
- "reach"  — selectivity high relative to this student
- "match"  — a solid, realistic fit
- "safety" — very likely a fit / below the student's level of competitiveness

Prefer surfacing at least one strong but non-obvious choice. Respect the student's tuition constraint as soft guidance when present.

Return ONLY a JSON array (no prose, no markdown fences) of objects:
[{ "programId": string, "whyItFits": string, "label": "reach"|"match"|"safety", "rank": number }]

Use ONLY programIds from the provided list. rank starts at 1 (best). Return at most 10 items.`;

/**
 * LLM call 1 — read the CV PDF (+ form values) and return a StudentProfile.
 * The PDF is passed as a base64 document block to the multimodal model.
 */
export async function extractProfile(
  pdfBase64: string,
  formValues: {
    levelSought: string;
    countriesOpenTo: string[];
    fieldsOfInterest: string[];
    maxTuitionEurPerYear: number | null;
    interestsFreeText: string;
    otherConstraints: string;
  }
): Promise<StudentProfile> {
  const anthropic = getClient();

  const formText = `Form answers (authoritative where they overlap with the CV):
- Level sought: ${formValues.levelSought}
- Countries open to: ${
    formValues.countriesOpenTo.length
      ? formValues.countriesOpenTo.join(", ")
      : "(none specified — open to any)"
  }
- Fields of interest: ${
    formValues.fieldsOfInterest.length
      ? formValues.fieldsOfInterest.join(", ")
      : "(none specified)"
  }
- Max tuition (EUR/year): ${
    formValues.maxTuitionEurPerYear ?? "(no limit specified)"
  }
- Interests, in the student's own words: ${
    formValues.interestsFreeText || "(none provided)"
  }
- Other constraints: ${formValues.otherConstraints || "(none provided)"}`;

  // Explicitly typed so TS treats the mixed blocks as a ContentBlockParam union.
  const content: Anthropic.ContentBlockParam[] = [
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: pdfBase64,
      },
    },
    { type: "text", text: formText },
  ];

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: PROFILE_SYSTEM,
    messages: [{ role: "user", content }],
  });

  return parseJsonLoose<StudentProfile>(textOf(message));
}

/**
 * LLM call 2 — rank the hard-filtered survivors in a SINGLE call so the model
 * makes good relative judgments across the whole set.
 */
export async function rankPrograms(
  profile: StudentProfile,
  programs: Program[]
): Promise<Recommendation[]> {
  const anthropic = getClient();

  const userText = `STUDENT PROFILE:
${JSON.stringify(profile, null, 2)}

CANDIDATE PROGRAMS (already filtered to match level, language, and country):
${JSON.stringify(programs, null, 2)}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: RANK_SYSTEM,
    messages: [{ role: "user", content: userText }],
  });

  const recs = parseJsonLoose<Recommendation[]>(textOf(message));

  // Defensive: keep only recs that point at a real, in-scope program.
  const validIds = new Set(programs.map((p) => p.id));
  return recs
    .filter(
      (r) => r && typeof r.programId === "string" && validIds.has(r.programId)
    )
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
}
