import React from 'react';

export default function DataTable({ columns, rows, emptyMessage = 'No records found.' }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-medium uppercase tracking-[0.18em] text-xs">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!rows.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length}>{emptyMessage}</td>
              </tr>
            ) : rows.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="transition hover:bg-slate-50/70">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 align-middle text-slate-700">{column.render ? column.render(row) : row[column.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}