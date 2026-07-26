'use client';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface Props {
  columns: Column[];
  data: any[];
  emptyMessage?: string;
}

export default function DataTable({ columns, data, emptyMessage = 'Aucune donnée.' }: Props) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} style={{
              textAlign: 'left', color: '#999', fontWeight: 600, fontSize: 11,
              textTransform: 'uppercase', padding: '10px 12px',
              borderBottom: '1px solid #9B7A2F',
            }}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} style={{ padding: 30, textAlign: 'center', color: '#666' }}>
              {emptyMessage}
            </td>
          </tr>
        ) : (
          data.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #333' }}>
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '11px 12px', color: '#eee' }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
