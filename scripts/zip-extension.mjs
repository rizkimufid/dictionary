import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, rmSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const extDir = path.join(repoRoot, "extension")
const outDir = path.join(repoRoot, "dist-extension")
const outFile = path.join(outDir, "dict-search.zip")

const entries = ["manifest.json", "icons", "content", "options", "popup", "common"]

mkdirSync(outDir, { recursive: true })

try {
  execFileSync(
    "tar",
    ["-a", "-cf", outFile, ...entries],
    { cwd: extDir, stdio: "inherit" }
  )
} catch (e) {
  rmSync(outFile, { force: true })
  throw new Error("Gagal zip. Butuh 'tar' (bawaan Windows 10+ / macOS / Linux).")
}

if (existsSync(outFile)) {
  console.log("OK:", outFile)
} else {
  throw new Error("File zip tidak terbuat.")
}