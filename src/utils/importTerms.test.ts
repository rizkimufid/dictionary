import assert from "node:assert/strict";
import test from "node:test";
import { buildImportPreview, ImportFileError } from "./importTerms.ts";

test("buildImportPreview mendukung header lama dan classifies duplikat", () => {
    const preview = buildImportPreview(
        [
            ["Indonesia", "Inggris", "Korea"],
            ["Existing", "There", "있다"],
            ["Ada", "Ready", "준비"],
            ["Ada", "Duplicate", "중복"],
            ["", "English only", ""],
            ["", "", "", "Description only"],
        ],
        [{ termID: "Existing" }],
    );

    assert.deepEqual(
        preview.rows.map(({ status, reason }) => ({ status, reason })),
        [
            { status: "duplicate", reason: "duplicateExisting" },
            { status: "ready", reason: undefined },
            { status: "duplicate", reason: "duplicateFile" },
            { status: "ready", reason: undefined },
            { status: "invalid", reason: "empty" },
        ],
    );
    assert.equal(preview.rows[3].input.termEN, "English only");
    assert.equal(preview.rows[0].input.termKR, "있다");
});

test("buildImportPreview menormalisasi header standar", () => {
    const preview = buildImportPreview(
        [
            ["Term ID", "Term EN", "Term KR", "Description"],
            [" Header ", " Header ", " 헤더 ", " Note "],
        ],
        [],
    );

    assert.equal(preview.rows.length, 1);
    assert.deepEqual(preview.rows[0].input, {
        termID: "Header",
        termEN: "Header",
        termKR: "헤더",
        description: "Note",
    });
});

test("buildImportPreview menolak header yang tidak dikenali", () => {
    assert.throws(
        () => buildImportPreview([["name", "value"], ["A", "B"]], []),
        (error: unknown) => error instanceof ImportFileError && error.code === "invalidHeaders",
    );
});
