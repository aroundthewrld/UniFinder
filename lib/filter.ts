import type { Program, StudentProfile } from "./types";

/**
 * Deterministic hard filter — runs in plain TypeScript, NOT the LLM.
 *
 * The LLM must never decide whether a program is taught in English or located
 * in a chosen country; otherwise it can hallucinate a program through a hard
 * constraint. We enforce these here so only valid candidates reach ranking.
 *
 * Filters applied:
 *   - level   : must equal the level the student is seeking
 *   - language: English only for the MVP
 *   - country : must be in countriesOpenTo (skipped when the list is empty)
 *
 * Tuition is intentionally NOT a hard filter: tuitionEurPerYear can be null
 * (unknown/varies), and quietly dropping those would hide good options. The
 * student's budget is passed to the ranking model as soft guidance instead.
 */
export function hardFilter(
  profile: StudentProfile,
  programs: Program[]
): Program[] {
  const openCountries = normalizeCountries(profile.countriesOpenTo);

  return programs.filter((program) => {
    if (program.level !== profile.levelSought) return false;

    if (program.language.trim().toLowerCase() !== "english") return false;

    // Empty list = open to any country -> skip the country filter.
    if (openCountries.length > 0) {
      if (!openCountries.includes(program.country.trim().toLowerCase())) {
        return false;
      }
    }

    return true;
  });
}

function normalizeCountries(countries: string[]): string[] {
  return countries
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c.length > 0);
}
