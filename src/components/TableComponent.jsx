export default function TableComponent({ headers, children }) {
  return (
    <div className="overflow-x-auto bg-card rounded-lg border border-border">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted uppercase bg-background/50 border-b border-border">
          <tr>
            {headers.map((header, index) => (
              <th key={index} scope="col" className="px-6 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {children}
        </tbody>
      </table>
    </div>
  );
}
