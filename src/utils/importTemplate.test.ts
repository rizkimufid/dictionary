import assert from "node:assert/strict";
import test from "node:test";
import { buildImportPreview } from "./importTerms.ts";
import { TEMPLATE_ROWS } from "./importTemplate.ts";

test("template XLSX memiliki header dan contoh baris yang diterima parser", () => {
    const preview = buildImportPreview(TEMPLATE_ROWS, []);

    assert.deepEqual(TEMPLATE_ROWS[0], ["termID", "termEN", "termKR", "description"]);
    assert.deepEqual(preview.rows.map(({ status }) => status), ["ready", "ready"]);
});
