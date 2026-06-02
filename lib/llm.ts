import Anthropic from "@anthropic-ai/sdk";
import type { Recommendation } from "./types";

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

const RECOMMEND_SYSTEM = `You are an expert study-abroad advisor with broad knowledge of European universities. You are given a student's background (either as a CV PDF, or as typed answers when they have no CV) plus their form answers. Recommend and rank real degree programs that fit them.

HARD CONSTRAINTS — every program you return MUST satisfy all of these:
1. LEVEL: exactly the level the student is seeking (bachelor or master). Never mix levels.
2. LANGUAGE: must be taught in English.
3. FIELD: must align with the student's stated fields of interest and background, across ANY discipline (e.g. humanities, business, sciences, arts, law, health, engineering — whatever fits the student).
4. COUNTRY: if the student listed countries, the program must be located in one of them. If they listed none, you may choose any European country.
Only recommend well-known, real programs at real universities that you are confident actually exist. Do NOT invent programs or universities.

ACCURACY: You are recommending from your own knowledge, so facts (especially tuition and exact duration) may be out of date or vary by nationality. Do NOT state a single precise tuition number as if it were authoritative. In "tuitionNote", give a brief, honest characterization (e.g. "Free for EU/EEA; non-EU ~€15k–20k/yr — verify", or "Income-based, roughly €900–3,900/yr — verify"). Never fabricate credentials the student doesn't have.

TASK: Understand the student's real background (degree, coursework, projects, skills, standing) from whatever was provided, combine it with their stated interests, then select and rank up to 10 best-fit programs. When the background is sparse (no CV), rely more on stated fields and interests. Prefer surfacing at least one strong but non-obvious choice.

For each program write a single-sentence "whyItFits" that references the student's SPECIFIC background or interests — not generic filler. Good: "Your fieldwork in coastal ecology and stats coursework line up with this program's marine-conservation modelling track." Bad: "This program matches your interest in the field."

Assign a label relative to this student:
- "reach"  — competitive/selective for this profile
- "match"  — a solid, realistic fit
- "safety" — very likely attainable

Return ONLY a JSON array (no prose, no markdown fences) of objects with EXACTLY these fields:
[{
  "name": string,            // official program name
  "university": string,
  "country": string,
  "city": string,
  "field": string,           // discipline, e.g. "Psychology", "Business", "Computer Science", "Architecture"
  "durationMonths": number,  // typical duration, e.g. 24
  "tuitionNote": string,     // honest, non-authoritative tuition characterization
  "whyItFits": string,       // one specific sentence
  "label": "reach"|"match"|"safety",
  "rank": number             // 1 = best
}]

Return at most 10 items, ranked best-first (rank starts at 1).`;

export interface RecommendInput {
  // Provide ONE of these two background sources:
  pdfBase64?: string; // CV path
  manualBackground?: {
    academicBackground: string;
    skills: string[];
    notableProjects: string;
  }; // no-CV path
  formValues: {
    levelSought: string;
    countriesOpenTo: string[];
    fieldsOfInterest: string[];
    maxTuitionEurPerYear: number | null;
    interestsFreeText: string;
    otherConstraints: string;
  };
}

const VALID_LABELS = new Set(["reach", "match", "safety"]);

/**
 * Single LLM call: student background (CV PDF *or* typed answers) + form answers
 * → ranked recommendations generated from the model's own knowledge. The PDF,
 * when present, is read natively by the multimodal model.
 */
export async function recommendFromCv({
  pdfBase64,
  manualBackground,
  formValues,
}: RecommendInput): Promise<Recommendation[]> {
  const anthropic = getClient();

  const backgroundText = manualBackground
    ? `STUDENT BACKGROUND (typed by the student — no CV provided):
- Academic background: ${manualBackground.academicBackground || "(not provided)"}
- Skills: ${
        manualBackground.skills.length
          ? manualBackground.skills.join(", ")
          : "(none listed)"
      }
- Notable projects / experience: ${
        manualBackground.notableProjects || "(none provided)"
      }

`
    : "";

  const formText = `${backgroundText}STUDENT FORM ANSWERS:
- Level sought: ${formValues.levelSought}
- Countries open to: ${
    formValues.countriesOpenTo.length
      ? formValues.countriesOpenTo.join(", ")
      : "(none specified — any European country is allowed)"
  }
- Fields of interest: ${
    formValues.fieldsOfInterest.length
      ? formValues.fieldsOfInterest.join(", ")
      : "(none specified — infer from the background)"
  }
- Max tuition (EUR/year): ${
    formValues.maxTuitionEurPerYear ?? "(no limit specified)"
  }
- Interests, in the student's own words: ${
    formValues.interestsFreeText || "(none provided)"
  }
- Other constraints: ${formValues.otherConstraints || "(none provided)"}

Recommend up to 10 real, English-taught ${formValues.levelSought}-level university programs that satisfy every hard constraint above.`;

  // Explicitly typed so TS treats the mixed blocks as a ContentBlockParam union.
  const content: Anthropic.ContentBlockParam[] = [];
  if (pdfBase64) {
    content.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: pdfBase64,
      },
    });
  }
  content.push({ type: "text", text: formText });

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: RECOMMEND_SYSTEM,
    messages: [{ role: "user", content }],
  });

  const recs = parseJsonLoose<Recommendation[]>(textOf(message));

  if (!Array.isArray(recs)) {
    throw new Error("Model did not return a list of recommendations.");
  }

  // Normalize + keep only structurally-valid entries, then re-rank 1..N.
  return recs
    .filter(
      (r) =>
        r &&
        typeof r.name === "string" &&
        r.name.trim() !== "" &&
        typeof r.university === "string" &&
        r.university.trim() !== "" &&
        typeof r.whyItFits === "string" &&
        VALID_LABELS.has(r.label as string)
    )
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .slice(0, 10)
    .map((r, i) => ({
      name: r.name.trim(),
      university: r.university.trim(),
      country: typeof r.country === "string" ? r.country.trim() : "",
      city: typeof r.city === "string" ? r.city.trim() : "",
      field: typeof r.field === "string" ? r.field.trim() : "",
      durationMonths:
        typeof r.durationMonths === "number" && Number.isFinite(r.durationMonths)
          ? r.durationMonths
          : null,
      tuitionNote: typeof r.tuitionNote === "string" ? r.tuitionNote.trim() : "",
      whyItFits: r.whyItFits.trim(),
      label: r.label,
      rank: i + 1, // re-rank 1..N after filtering
    }));
}
