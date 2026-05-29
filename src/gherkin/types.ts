// ─────────────────────────────────────────────────────────────
// Gherkin AST Types — parsed representation of .feature files
// ─────────────────────────────────────────────────────────────

export interface Feature {
  name: string;
  description: string;
  tags: string[];
  background: Step[] | null;
  scenarios: Scenario[];
}

export interface Scenario {
  name: string;
  tags: string[];
  steps: Step[];
  /** For Scenario Outline — each row becomes a separate run */
  examples: ExamplesTable | null;
}

export interface Step {
  keyword: "Given" | "When" | "Then" | "And" | "But";
  /** The effective keyword (And/But inherit from previous step) */
  resolvedKeyword: "Given" | "When" | "Then";
  text: string;
  /** Multi-line string argument (triple-quoted) */
  docString: string | null;
  /** Tabular data argument */
  dataTable: DataTableRow[] | null;
  line: number;
}

export interface DataTableRow {
  cells: string[];
}

export interface ExamplesTable {
  headers: string[];
  rows: string[][];
}
