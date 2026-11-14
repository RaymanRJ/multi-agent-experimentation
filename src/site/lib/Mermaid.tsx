import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

const dark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** The size a diagram was drawn at, from its viewBox, for the stylesheet to open it at a readable size. */
function drawnSize(svg: string): CSSProperties {
  const box = /viewBox="([^"]+)"/.exec(svg)?.[1]?.trim().split(/[\s,]+/).map(Number);
  return box?.length === 4 ? ({ '--w': box[2], '--h': box[3] } as CSSProperties) : {};
}

/**
 * A mermaid diagram, drawn in the browser. Mermaid is large, so it is loaded only when a diagram is on
 * the page, and redrawn when the system switches between light and dark.
 *
 * The page's column shrinks a wide diagram (on a phone, to a third of its size), so it also opens full size in a
 * dialog. That copy is drawn a second time under its own id, as mermaid names each drawing's styles and arrowheads
 * by its id.
 */
export function Mermaid({ chart, label, title }: { chart: string; label: string; title: string }) {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [svg, setSvg] = useState<{ inline: string; full: string } | null>(null);
  const [isDark, setDark] = useState(dark);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const change = () => setDark(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    let live = true;
    import('mermaid').then(async ({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'neutral', fontFamily: 'inherit' });
      const inline = await mermaid.render(id, chart);
      const full = await mermaid.render(`${id}-full`, chart);
      if (live) setSvg({ inline: inline.svg, full: full.svg });
    });
    return () => {
      live = false;
    };
  }, [chart, id, isDark]);

  if (svg === null) {
    return (
      <pre className="mermaid-source" aria-label={label}>
        {chart}
      </pre>
    );
  }

  const expand = () => dialog.current?.showModal();
  return (
    <div className="diagram-wrap">
      <figure className="diagram" role="img" aria-label={label} onClick={expand} dangerouslySetInnerHTML={{ __html: svg.inline }} />
      <button type="button" className="diagram-expand" aria-haspopup="dialog" onClick={expand}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
        Expand
      </button>
      {/* Its content fills it, so a click that lands on the dialog itself is a click on the backdrop. */}
      <dialog
        ref={dialog}
        className="diagram-dialog"
        aria-labelledby={`${id}-title`}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        <div className="diagram-bar">
          <strong id={`${id}-title`}>{title}</strong>
          <button type="button" className="diagram-close" onClick={() => dialog.current?.close()}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>
        <div className="diagram-full" role="img" aria-label={label} style={drawnSize(svg.full)} dangerouslySetInnerHTML={{ __html: svg.full }} />
      </dialog>
    </div>
  );
}

/** The first ```mermaid block in a markdown text that starts with `kind`, e.g. "sequenceDiagram". */
export function mermaidBlock(markdown: string, kind: string): string {
  const block = [...markdown.matchAll(/```mermaid\n([\s\S]*?)```/g)].find((m) => m[1]?.trimStart().startsWith(kind));
  return block?.[1]?.trim() ?? '';
}
