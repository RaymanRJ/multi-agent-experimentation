import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * "On this page", on every page: the page's sections, the one being read marked, and a line showing how far down the
 * page the reader is. Beside the text where the screen leaves room for it; otherwise a button in the corner showing
 * the section being read, which opens the list. Sections are the page's h2s, and a doc's h3s too.
 */

interface Section {
  el: HTMLElement;
  title: string;
  sub: boolean;
}

/** Where the list sits beside the text, or null to show the button instead. */
type Place = { left: number; top: number; width: number; height: number } | null;

const GAP = 40; // between the text and the list
const MIN_WIDTH = 190; // narrower than this, the list gives way to the button
const TOP = 24; // from the top of the screen, once the page has scrolled

function sectionsIn(main: HTMLElement): Section[] {
  const doc = main.querySelector('.doc') !== null;
  return [...main.querySelectorAll<HTMLElement>(doc ? 'h2, h3' : 'h2')]
    .filter((h) => h.getClientRects().length > 0 && !h.closest('dialog'))
    .map((h) => ({
      el: h,
      // A doc's headings carry a "#" link to themselves.
      title: [...h.childNodes]
        .filter((n) => !(n instanceof HTMLElement && n.classList.contains('anchor')))
        .map((n) => n.textContent)
        .join('')
        .trim(),
      sub: h.tagName === 'H3',
    }))
    .filter((s) => s.title !== '');
}

/** The section being read: the last whose heading has passed a line near the top, or the last at the page's end. */
function current(sections: Section[]): number {
  const page = document.documentElement;
  if (window.scrollY > 0 && window.scrollY + window.innerHeight >= page.scrollHeight - 2) return sections.length - 1;
  const line = Math.min(160, window.innerHeight * 0.3);
  let found = -1;
  sections.forEach((s, i) => {
    if (s.el.getBoundingClientRect().top <= line) found = i;
  });
  return found;
}

function placeBeside(main: HTMLElement): Place {
  const box = main.getBoundingClientRect();
  const width = Math.min(250, document.documentElement.clientWidth - box.right - GAP - 16);
  if (width < MIN_WIDTH) return null;
  // Level with the page's title (main's top padding is 40px), then held near the top of the screen.
  const top = Math.max(TOP, box.top + 40);
  return { left: Math.round(box.right + GAP), top: Math.round(top), width: Math.round(width), height: Math.round(window.innerHeight - top - TOP) };
}

const samePlace = (a: Place, b: Place) =>
  a === b || (a !== null && b !== null && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height);

const sameSections = (a: Section[], b: Section[]) =>
  a.length === b.length && a.every((s, i) => s.el === b[i]?.el && s.title === b[i]?.title);

export function PageNav() {
  const [sections, setSections] = useState<Section[]>([]);
  const [active, setActive] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [place, setPlace] = useState<Place>(null);
  const [open, setOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    let main: HTMLElement | null = null;
    let found: Section[] = [];
    let frame = 0;
    let rescan = true;
    // The page's content changes after it first shows (a doc loads, a diagram draws, a section opens), and a new page
    // brings a new <main>: both mean reading the sections again.
    const content = new MutationObserver(() => schedule(true));
    const shell = new MutationObserver(() => schedule(true));
    const app = document.querySelector('.app');
    if (app) shell.observe(app, { childList: true });

    const update = () => {
      frame = 0;
      const now = document.querySelector<HTMLElement>('main');
      if (now !== main) {
        content.disconnect();
        main = now;
        if (main) content.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
        rescan = true;
      }
      if (!main) return;
      if (rescan) {
        rescan = false;
        const next = sectionsIn(main);
        found = sameSections(found, next) ? found : next;
        setSections(found);
      }
      setActive(current(found));
      const end = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(end > 0 ? Math.min(1, Math.max(0, window.scrollY / end)) : 1);
      const next = placeBeside(main);
      setPlace((old) => (samePlace(old, next) ? old : next));
    };
    const schedule = (again = false) => {
      rescan ||= again;
      if (!frame) frame = requestAnimationFrame(update);
    };
    const moved = () => schedule();

    schedule(true);
    window.addEventListener('scroll', moved, { passive: true });
    window.addEventListener('resize', moved);
    return () => {
      cancelAnimationFrame(frame);
      content.disconnect();
      shell.disconnect();
      window.removeEventListener('scroll', moved);
      window.removeEventListener('resize', moved);
    };
  }, []);

  // A list longer than the screen scrolls by itself to keep the section being read in sight.
  useEffect(() => {
    const box = nav.current;
    const item = box?.querySelector('[aria-current]');
    if (!box || !item || box.scrollHeight <= box.clientHeight) return;
    box.scrollTop += item.getBoundingClientRect().top - box.getBoundingClientRect().top - box.clientHeight / 2;
  }, [active, place]);

  // The button's list closes on Esc or a click elsewhere.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !nav.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (sections.length < 2) return null;

  const go = (s: Section) => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    s.el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    setOpen(false);
  };
  const list = (
    <div className="page-nav-body">
      <div className="page-nav-track" aria-hidden="true">
        <div className="page-nav-fill" style={{ height: `${progress * 100}%` }} />
      </div>
      <ol>
        {sections.map((s, i) => (
          <li key={i} className={s.sub ? 'sub' : undefined}>
            <button type="button" aria-current={i === active ? 'location' : undefined} onClick={() => go(s)}>
              {s.title}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );

  if (place) {
    return (
      <nav ref={nav} className="page-nav beside" aria-label="On this page" style={{ left: place.left, top: place.top, width: place.width, maxHeight: place.height }}>
        <p className="page-nav-head">On this page</p>
        {list}
      </nav>
    );
  }
  return (
    <nav ref={nav} className="page-nav corner" aria-label="On this page">
      {open && <div className="page-nav-panel">{list}</div>}
      <button type="button" className="page-nav-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="page-nav-ring" style={{ '--done': progress } as CSSProperties} aria-hidden="true" />
        <span className="page-nav-now">{sections[active]?.title ?? 'On this page'}</span>
      </button>
    </nav>
  );
}
