import type { CSSProperties, ReactNode, RefObject } from 'react';

/**
 * Opening a figure full size, for the diagram and the screenshots: the page's column shrinks a wide figure past reading
 * (on a phone, the control-loop diagram to a third of its size).
 */

/**
 * The width a figure opens at, for the stylesheet to fit to the screen: never under `min` px (a figure of text, so it
 * can be read; on a phone, scroll it) and never over `max` px; `ratio` is its width over its height.
 */
export function openSize(min: number, max: number, ratio: number): CSSProperties {
  return { '--min-w': `${min}px`, '--max-w': `${max}px`, '--ratio': ratio } as CSSProperties;
}

export function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

/** The dialog a figure opens in, closed by Esc, its Close button or a click outside. `children` holds the figure. */
export function Enlarged({ id, title, dialog, children }: { id: string; title: string; dialog: RefObject<HTMLDialogElement | null>; children: ReactNode }) {
  // Its content fills it, so a click that lands on the dialog itself is a click on the backdrop.
  return (
    <dialog ref={dialog} className="enlarge-dialog" aria-labelledby={`${id}-title`} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
      <div className="enlarge-bar">
        <strong id={`${id}-title`}>{title}</strong>
        <button type="button" className="enlarge-button" onClick={() => dialog.current?.close()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
