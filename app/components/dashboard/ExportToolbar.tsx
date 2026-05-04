"use client";

import { Printer, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

export type ExportValue = string | number | boolean | null | undefined | Date;

export type ExportColumn<T> = {
  label: string;
  key?: keyof T;
  getValue?: (row: T) => ExportValue;
};

type ExportToolbarProps<T extends object> = {
  title: string;
  rows: T[];
  columns: ExportColumn<T>[];
  filename?: string;
  sheetName?: string;
};

function toCellValue(v: ExportValue): string | number | boolean | null {
  if (v === undefined || v === null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return v;
  return String(v);
}

export function ExportToolbar<T extends object>({
  title,
  rows,
  columns,
  filename,
  sheetName,
}: ExportToolbarProps<T>) {
  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (!rows.length) return;

    const dataForExcel: Record<string, string | number | boolean | null>[] =
      rows.map((row) => {
        const out: Record<string, string | number | boolean | null> = {};

        columns.forEach((col) => {
          let raw: ExportValue = null;

          if (col.getValue) {
            raw = col.getValue(row);
          } else if (col.key) {
            // acesso seguro sem exigir index signature no tipo T
            const rec = row as Record<string, unknown>;
            raw = rec[col.key as string] as ExportValue;
          }

          out[col.label] = toCellValue(raw);
        });

        return out;
      });

    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName ?? title);

    const safeName =
      (filename ?? title)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "export";

    XLSX.writeFile(wb, `${safeName}.xlsx`);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePrint}
        type="button"
        className="inline-flex items-center gap-2 px-3 py-2
                   border border-gray-300 rounded-lg text-gray-700
                   hover:bg-gray-50 text-sm"
      >
        <Printer size={16} />
        Imprimir
      </button>

      <button
        onClick={handleExportExcel}
        type="button"
        className="inline-flex items-center gap-2 px-3 py-2
                   border border-gray-300 rounded-lg text-gray-700
                   hover:bg-gray-50 text-sm"
      >
        <FileSpreadsheet size={16} />
        Excel
      </button>
    </div>
  );
}
