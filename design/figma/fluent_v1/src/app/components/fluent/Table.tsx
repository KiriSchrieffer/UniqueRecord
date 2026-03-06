import React from 'react';
import { useI18n } from '../../i18n';

interface TableColumn {
  key: string;
  header: string;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface TableProps {
  columns: TableColumn[];
  data: any[];
  emptyMessage?: string;
  className?: string;
}

export function Table({ columns, data, emptyMessage, className = '' }: TableProps) {
  const { tr } = useI18n();
  const resolvedEmptyMessage = emptyMessage || tr('暂无数据', 'No data');

  if (data.length === 0) {
    return (
      <div className={`bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-12 text-center ${className}`}>
        <p className="text-[var(--muted-foreground)] text-[14px]">{resolvedEmptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="bg-[var(--neutral-10)] border-b border-[var(--border)]">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-left text-[12px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide"
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--neutral-10)] transition-colors duration-100"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-[14px] text-[var(--foreground)]">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
