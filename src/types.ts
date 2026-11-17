export interface TermEntry {
  id: string
  /** Bahasa Indonesia */
  termID: string
  /** Bahasa Inggris */
  termEN: string
  /** Bahasa Korea */
  termKR: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface TermInput {
  termID: string
  termEN: string
  termKR: string
  description?: string
}

export type CopyFormat = "code" | "json" | "text"
export type AppLocale = "id" | "en" | "kr"
export type ViewMode = "card" | "table"
