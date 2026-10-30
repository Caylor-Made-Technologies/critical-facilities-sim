/** Renders content blocks (see src/content/types.ts). All text is plain strings, so React escapes it. */
import type { Block } from '../../content/types';

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if ('h' in b)
          return (
            <h3 key={i}>
              <span className="dot" aria-hidden="true" />
              {b.h}
            </h3>
          );
        if ('p' in b) return <p key={i}>{b.p}</p>;
        if ('ul' in b)
          return (
            <ul key={i}>
              {b.ul.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          );
        if ('ol' in b)
          return (
            <ol key={i}>
              {b.ol.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          );
        if ('callout' in b)
          return (
            <div key={i} className={`callout${b.tone === 'warn' ? ' callout-warn' : b.tone === 'danger' ? ' callout-danger' : ''}`}>
              {b.title && <strong>{b.title}: </strong>}
              {b.callout}
            </div>
          );
        return (
          <div key={i} className="table-wrap" tabIndex={0} role="region" aria-label="Table (scrolls sideways)">
            <table className="t">
              <thead>
                <tr>
                  {b.table.head.map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.table.rows.map((r, j) => (
                  <tr key={j}>
                    {r.map((c, k) => (k === 0 ? <th key={k} scope="row">{c}</th> : <td key={k}>{c}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
