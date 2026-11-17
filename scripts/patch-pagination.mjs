import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../node_modules/@skyworx/dynamic-ui/dist");

if (!fs.existsSync(distDir)) {
    console.log("@skyworx/dynamic-ui dist not found, skipping patch.");
    process.exit(0);
}

const files = fs.readdirSync(distDir);
let patchedCount = 0;

for (const file of files) {
    if (!file.endsWith(".js")) continue;
    const filePath = path.join(distDir, file);
    let content = fs.readFileSync(filePath, "utf8");
    let changed = false;

    // Patch index-*.js:
    // f(Math.max(1, e.currentPage - 2)) -> f(1)
    // f(Math.min(s.value, e.currentPage + 2)) -> f(s.value)
    if (content.includes("f(Math.max(1, e.currentPage - 2))")) {
        content = content.replaceAll("f(Math.max(1, e.currentPage - 2))", "f(1)");
        changed = true;
    }
    if (content.includes("f(Math.min(s.value, e.currentPage + 2))")) {
        content = content.replaceAll("f(Math.min(s.value, e.currentPage + 2))", "f(s.value)");
        changed = true;
    }

    // Patch dynamic-ui.umd.js:
    // h(Math.max(1,t.currentPage-2)) -> h(1)
    // h(Math.min(o.value,t.currentPage+2)) -> h(o.value)
    if (content.includes("h(Math.max(1,t.currentPage-2))")) {
        content = content.replaceAll("h(Math.max(1,t.currentPage-2))", "h(1)");
        changed = true;
    }
    if (content.includes("h(Math.min(o.value,t.currentPage+2))")) {
        content = content.replaceAll("h(Math.min(o.value,t.currentPage+2))", "h(o.value)");
        changed = true;
    }

    // Tooltips / aria-labels
    if (content.includes('"2 halaman sebelumnya (-2)"')) {
        content = content.replaceAll('"2 halaman sebelumnya (-2)"', '"Halaman pertama"');
        changed = true;
    }
    if (content.includes('"2 halaman selanjutnya (+2)"')) {
        content = content.replaceAll('"2 halaman selanjutnya (+2)"', '"Halaman terakhir"');
        changed = true;
    }
    if (content.includes('"Previous 2 pages (-2)"')) {
        content = content.replaceAll('"Previous 2 pages (-2)"', '"First page"');
        changed = true;
    }
    if (content.includes('"Next 2 pages (+2)"')) {
        content = content.replaceAll('"Next 2 pages (+2)"', '"Last page"');
        changed = true;
    }
    if (content.includes('"이전 2페이지 (-2)"')) {
        content = content.replaceAll('"이전 2페이지 (-2)"', '"첫 페이지"');
        changed = true;
    }
    if (content.includes('"다음 2페이지 (+2)"')) {
        content = content.replaceAll('"다음 2페이지 (+2)"', '"마지막 페이지"');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content, "utf8");
        patchedCount++;
        console.log(`Patched ${file} successfully.`);
    }
}

console.log(`Pagination patch completed. Patched ${patchedCount} files.`);
