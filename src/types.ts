export type TermCategory =
  | "field"
  | "placeholder"
  | "action"
  | "title"
  | "table-header"

export interface TermEntry {
  id: string
  /** Bahasa Indonesia */
  termID: string
  /** Bahasa Inggris */
  termEN: string
  /** Bahasa Korea */
  termKR: string
  category: TermCategory
  description?: string
  createdAt: string
  updatedAt: string
}

export type CopyFormat = "code" | "json" | "text"
export type AppLocale = "id" | "en" | "kr"
export type ViewMode = "card" | "table"
