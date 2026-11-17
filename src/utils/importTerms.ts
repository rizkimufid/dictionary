import type { TermEntry, TermInput } from "@/types"

export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024
export const MAX_IMPORT_ROWS = 5000

export type ImportFileErrorCode =
  | "fileType"
  | "fileSize"
  | "emptyFile"
  | "invalidCsv"
  | "invalidXlsx"
  | "invalidHeaders"
  | "tooManyRows"

export type ImportRowStatus = "ready" | "duplicate" | "invalid"
export type ImportRowReason = "empty" | "duplicateExisting" | "duplicateFile"

export class ImportFileError extends Error {
  readonly code: ImportFileErrorCode

  constructor(code: ImportFileErrorCode) {
    super(code)
    this.name = "ImportFileError"
    this.code = code
  }
}

export interface ImportCandidate {
  rowNumber: number
  input: TermInput
  status: ImportRowStatus
  reason?: ImportRowReason
}

export interface ImportPreview {
  rows: ImportCandidate[]
}

const HEADER_ALIASES = {
  termID: new Set(["termid", "id", "indonesia"]),
  termEN: new Set(["termen", "en", "inggris", "english"]),
  termKR: new Set(["termkr", "kr", "korea", "korean"]),
  description: new Set(["description", "deskripsi"]),
} as const

function cellText(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") {
    if ("result" in value) return cellText(value.result)
    if ("text" in value) return cellText(value.text)
  }
  return String(value)
}

function normalizedHeader(value: unknown): string {
  return cellText(value)
    .replace(/^\uFEFF/, "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s_-]+/g, "")
}

function hasValue(values: unknown[]): boolean {
  return values.some((value) => cellText(value).trim())
}

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLocaleLowerCase()
  return name.endsWith(".csv") || name.endsWith(".xlsx")
}

async function readRows(file: File): Promise<unknown[][]> {
  if (!isAcceptedFile(file)) throw new ImportFileError("fileType")
  if (file.size === 0) throw new ImportFileError("emptyFile")
  if (file.size > MAX_IMPORT_FILE_SIZE) throw new ImportFileError("fileSize")

  const name = file.name.toLocaleLowerCase()
  if (name.endsWith(".csv")) {
    const { parse } = await import("csv-parse/browser/esm/sync")
    try {
      return parse(await file.text(), {
        bom: true,
        relax_column_count: true,
        skip_empty_lines: false,
      }) as unknown as unknown[][]
    } catch {
      throw new ImportFileError("invalidCsv")
    }
  }

  const { readSheet } = await import("read-excel-file/browser")
  try {
    return await readSheet(file)
  } catch {
    throw new ImportFileError("invalidXlsx")
  }
}

export function buildImportPreview(
  rows: unknown[][],
  existingTerms: Array<Pick<TermEntry, "termID">>,
): ImportPreview {
  const header = rows[0] ?? []
  const normalized = header.map(normalizedHeader)
  const findColumn = (aliases: ReadonlySet<string>) =>
    normalized.findIndex((value) => aliases.has(value))
  const columns = {
    termID: findColumn(HEADER_ALIASES.termID),
    termEN: findColumn(HEADER_ALIASES.termEN),
    termKR: findColumn(HEADER_ALIASES.termKR),
    description: findColumn(HEADER_ALIASES.description),
  }

  if (
    columns.termID < 0 &&
    columns.termEN < 0 &&
    columns.termKR < 0
  ) {
    throw new ImportFileError("invalidHeaders")
  }

  const dataRows = rows.slice(1)
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new ImportFileError("tooManyRows")
  }

  const existingIds = new Set(existingTerms.map((term) => term.termID.trim()))
  const fileIds = new Set<string>()

  const candidates: ImportCandidate[] = []
  for (const [index, values] of dataRows.entries()) {
    if (!hasValue(values)) continue

    const termID = cellText(values[columns.termID]).trim()
    const termEN = cellText(values[columns.termEN]).trim()
    const termKR = cellText(values[columns.termKR]).trim()
    const description = columns.description < 0
      ? ""
      : cellText(values[columns.description]).trim()
    const input: TermInput = { termID, termEN, termKR, description }
    const rowNumber = index + 2

    if (!termID && !termEN && !termKR) {
      candidates.push({ rowNumber, input, status: "invalid", reason: "empty" })
      continue
    }

    const key = termID
    if (existingIds.has(key)) {
      candidates.push({ rowNumber, input, status: "duplicate", reason: "duplicateExisting" })
      continue
    }
    if (fileIds.has(key)) {
      candidates.push({ rowNumber, input, status: "duplicate", reason: "duplicateFile" })
      continue
    }
    fileIds.add(key)
    candidates.push({ rowNumber, input, status: "ready" })
  }

  return { rows: candidates }
}

export async function parseTermFile(
  file: File,
  existingTerms: Array<Pick<TermEntry, "termID">>,
): Promise<ImportPreview> {
  return buildImportPreview(await readRows(file), existingTerms)
}
