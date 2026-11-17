// Header di sini harus selalu bisa diparsing oleh importTerms.ts (dicek oleh test).
export const TEMPLATE_ROWS: string[][] = [
    ["termID", "termEN", "termKR", "description"],
    ["Nama Depan", "First Name", "이름", "Contoh baris — hapus lalu isi dengan data Anda"],
    ["Simpan", "Save", "저장", "Baris kedua contoh"],
];

export async function downloadTemplate(): Promise<void> {
    // ponytail: lazy import supaya writer tidak masuk bundle awal
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const rows = TEMPLATE_ROWS.map((row, index) =>
        index === 0 ? row.map((value) => ({ value, fontWeight: "bold" as const })) : row,
    );

    await writeXlsxFile(rows, {
        sheet: "Dictionary",
        stickyRowsCount: 1,
        columns: [{ width: 24 }, { width: 24 }, { width: 24 }, { width: 64 }],
    }).toFile("dictionary-import-template.xlsx");
}
