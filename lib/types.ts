// One program in the curated dataset.
export interface Program {
  id: string;
  name: string; // e.g. "MSc Artificial Intelligence"
  university: string;
  country: string; // e.g. "Netherlands"
  city: string;
  level: "bachelor" | "master";
  language: string; // "English" for all MVP records
  field: string; // e.g. "Computer Science", "Robotics", "Data Science"
  durationMonths: number;
  tuitionEurPerYear: number | null; // null if unknown/varies
  selectivityTier: "high" | "medium" | "low"; // drives reach/match/safety
  distinctiveNote: string; // ⭐ free text: research strengths, unusual specializations,
  // industry ties. THIS is the raw material for good explanations.
  url: string;
}

// Extracted from the CV + form by LLM call 1.
export interface StudentProfile {
  levelSought: "bachelor" | "master";
  countriesOpenTo: string[]; // empty array = open to any
  fieldsOfInterest: string[];
  academicBackground: string; // degree, field, rough standing, institution
  skills: string[];
  notableProjects: string; // free text
  constraints: {
    maxTuitionEurPerYear: number | null;
    other: string; // free text (location prefs, etc.)
  };
  interestsFreeText: string; // the student's own words about what they want
}

// One recommendation returned by LLM call 2.
export interface Recommendation {
  programId: string;
  whyItFits: string; // one sentence, references the student's actual profile
  label: "reach" | "match" | "safety";
  rank: number; // 1 = best
}

// What the client form sends alongside the PDF.
export interface FormValues {
  levelSought: "bachelor" | "master";
  countriesOpenTo: string; // comma-separated in the UI; parsed server-side
  fieldsOfInterest: string; // comma-separated
  maxTuitionEurPerYear: string; // empty = no limit
  interestsFreeText: string;
  otherConstraints: string;
}

// A recommendation joined with its full program record, for rendering.
export interface RankedProgram extends Recommendation {
  program: Program;
}
