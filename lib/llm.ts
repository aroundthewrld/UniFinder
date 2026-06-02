import Anthropic from "@anthropic-ai/sdk";
import type { Program, Recommendation } from "./types";

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

const RECOMMEND_SYSTEM = `You are an expert study-abroad advisor. You are given a student's background (either as a CV PDF, or as typed answers when they have no CV), their form answers, and a list of candidate programs that have ALREADY been pre-filtered in code to match the student's level, English-teaching, and chosen countries. Do not second-guess that filter — only choose from the provided list.

Your job: understand the student's real background (degree, coursework, projects, skills, standing) from whatever was provided, combine it with their stated interests, then select and rank the ~10 best-fit programs from the candidate list. When the background is sparse (no CV), rely more on their stated fields and interests and avoid assuming credentials they didn't mention.

For each chosen program write a single-sentence "whyItFits" that references the student's SPECIFIC background or interests — not generic filler — and draws on that program's distinctiveNote. Good: "Their distributed-systems coursework and your kernel project line up with this lab's focus on edge computing." Bad: "This program matches your interest in CS."

Assign a label:
- "reach"  — selectivity high relative to this student
- "match"  — a solid, realistic fit
- "safety" — very likely a fit / below the student's level of competitiveness

Prefer surfacing at least one strong but non-obvious choice. Respect the student's tuition constraint as soft guidance when present. Never invent credentials the CV doesn't support.

Return ONLY a JSON array (no prose, no markdown fences) of objects:
[{ "programId": string, "whyItFits": string, "label": "reach"|"match"|"safety", "rank": number }]

Use ONLY programIds from the provided candidate list. rank starts at 1 (best). Return at most 10 items.`;

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
  candidates: Program[];
}

/**
 * Single LLM call: student background (CV PDF *or* typed answers) + form answers
 * + pre-filtered candidate programs → ranked recommendations. The PDF, when
 * present, is read natively by the multimodal model — no separate
 * profile-extraction round-trip is needed.
 */
export async function recommendFromCv({
  pdfBase64,
  manualBackground,
  formValues,
  candidates,
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
      : "(none specified — open to any)"
  }
- Fields of interest: ${
    formValues.fieldsOfInterest.length
      ? formValues.fieldsOfInterest.join(", ")
      : "(none specified — infer from the CV)"
  }
- Max tuition (EUR/year): ${
    formValues.maxTuitionEurPerYear ?? "(no limit specified)"
  }
- Interests, in the student's own words: ${
    formValues.interestsFreeText || "(none provided)"
  }
- Other constraints: ${formValues.otherConstraints || "(none provided)"}

CANDIDATE PROGRAMS (already filtered to match level, language, and country — choose only from these):
${JSON.stringify(candidates, null, 2)}`;

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
    max_tokens: 2000,
    system: RECOMMEND_SYSTEM,
    messages: [{ role: "user", content }],
  });

  const recs = parseJsonLoose<Recommendation[]>(textOf(message));

  // Defensive: keep only recs that point at a real, in-scope program.
  const validIds = new Set(candidates.map((p) => p.id));
  return recs
    .filter(
      (r) => r && typeof r.programId === "string" && validIds.has(r.programId)
    )
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
}
