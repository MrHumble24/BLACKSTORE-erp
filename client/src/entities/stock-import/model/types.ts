/** One skipped spreadsheet row: 1-based Excel row number and why (FR-7). */
export interface ImportError {
  row: number;
  message: string;
}

/** Result of POST /items/import: good rows are created, bad rows are listed (FR-7). */
export interface ImportResult {
  created: number;
  errors: ImportError[];
}
