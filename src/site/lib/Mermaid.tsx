import { useEffect, useId, useState } from 'react';

const dark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/**
 * A mermaid diagram, drawn in the browser. Mermaid is large, so it is loaded only when a diagram is on
 * the page, and redrawn when the system switches between light and dark.
 */
export function Mermaid({ chart, label }: { chart: string; label: string }) {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [isDark, setDark] = useState(dark);

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
      const out = await mermaid.render(id, chart);
      if (live) setSvg(out.svg);
    });
    return () => {
      live = false;
    };
  }, [chart, id, isDark]);

  return svg === null ? (
    <pre className="mermaid-source" aria-label={label}>
      {chart}
    </pre>
  ) : (
    <figure className="diagram" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

/** The first ```mermaid block in a markdown text that starts with `kind`, e.g. "sequenceDiagram". */
export function mermaidBlock(markdown: string, kind: string): string {
  const block = [...markdown.matchAll(/```mermaid\n([\s\S]*?)```/g)].find((m) => m[1]?.trimStart().startsWith(kind));
  return block?.[1]?.trim() ?? '';
}
