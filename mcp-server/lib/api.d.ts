// Types for the Photo Equation Solver library (require('photo-equation-solver-mcp')).
// Copyright (c) 2026 Sobhan Shahbazi. Proprietary: see LICENSE.

/** What came back for one input. */
export interface Result {
  /** true when the solver produced an answer; false when it could not (see `error`). For several problems: true only if every one succeeded. */
  ok: boolean;
  /**
   * 'solution'  one problem, answered
   * 'error'     one problem (or the whole input) could not be solved: read `error`
   * 'multiple'  several numbered problems: read `problems`
   * 'text'      a help page or other plain text: read `text`
   */
  kind: 'solution' | 'error' | 'multiple' | 'text';
  /** The maths that was sent (trimmed). null for a problem inside a 'multiple' result. */
  input: string | null;
  /** How the solver understood the input, for example "2x² - 5x + 3 = 0". Show it to the user: a misread shows up here. */
  readAs: string | null;
  /** The answer, one entry per line, exactly as printed: ["x = 1", "x = 3/2 (= 1.5)"]. Empty on failure. */
  answer: string[];
  /** The working, one entry per step, without the leading "- ". */
  working: string[];
  /** How the answer was checked, for example "substituting the solution back into the original equation gives equal sides". */
  check: string | null;
  /** Things to be aware of ("Only real solutions ... are found"). */
  notes: string[];
  /** true when a note says the input was probably misread. Ask a person to look at the original before relying on the answer. */
  needsReview: boolean;
  /** Why it failed, written so a person or a model can retry. null on success. */
  error: string | null;
  /** For kind 'multiple': one result per numbered problem, in order. Otherwise null. */
  problems: Result[] | null;
  /** 1-based position of this result inside a 'multiple' result. */
  index?: number;
  /** The complete printed result, exactly as the command line prints it. */
  text: string;
  /** A graph or picture as a base64 PNG, when the input asked for one and the optional package @napi-rs/canvas is installed. */
  picture: string | null;
  /** Lines the parser could not place in a field. Empty for every input the test suite knows. */
  unparsed: string[];
}

export interface SolveOptions {
  /** Solve for this one unknown, for example "t" in "v = u + a*t". */
  solveFor?: string;
}

/** Solves one input. Never throws and never rejects. The solver runs on the calling thread. */
export function solve(input: string, options?: SolveOptions): Promise<Result>;

/** Solves each input separately, in order. */
export function solveMany(inputs: string[], options?: SolveOptions): Promise<Result[]>;

/** Syntax help for a topic ("finance", "stats", "calculus", ...); without a topic, the list of topics. */
export function help(topic?: string): Promise<{ ok: boolean; topic: string | null; text: string }>;

/** Parses printed solver text into a Result. `ok` false means the text is a refusal message. */
export function parseResult(text: string, ok: boolean, input?: string): Result;

/** true when graphs can be drawn (the optional package @napi-rs/canvas is installed). */
export const hasCanvas: boolean;

/** The package version. */
export const version: string;
