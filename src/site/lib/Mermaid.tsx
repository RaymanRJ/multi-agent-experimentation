import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { Enlarged, ExpandIcon, openSize } from './Enlarge';

const dark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** The size a diagram opens at: never smaller than drawn (its viewBox), at most twice that. */
function drawnSize(svg: string): CSSProperties {
  const [, , w = 0, h = 0] = /viewBox="([^"]+)"/.exec(svg)?.[1]?.trim().split(/[\s,]+/).map(Number) ?? [];
  return w > 0 && h > 0 ? openSize(w, 2 * w, w / h) : {};
}

/**
 * A mermaid diagram, drawn in the browser. Mermaid is large, so it is loaded only when a diagram is on
 * the page, and redrawn when the system switches between light and dark.
 *
 * It also opens full size in a dialog. That copy is drawn a second time under its own id, as mermaid names each
 * drawing's styles and arrowheads by its id.
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
      <button type="button" className="enlarge-button diagram-expand" aria-haspopup="dialog" onClick={expand}>
        <ExpandIcon />
        Expand
      </button>
      <Enlarged id={id} title={title} dialog={dialog}>
        <div className="enlarge-content" role="img" aria-label={label} style={drawnSize(svg.full)} dangerouslySetInnerHTML={{ __html: svg.full }} />
      </Enlarged>
    </div>
  );
}

/** The first ```mermaid block in a markdown text that starts with `kind`, e.g. "sequenceDiagram". */
export function mermaidBlock(markdown: string, kind: string): string {
  const block = [...markdown.matchAll(/```mermaid\n([\s\S]*?)```/g)].find((m) => m[1]?.trimStart().startsWith(kind));
  return block?.[1]?.trim() ?? '';
}
