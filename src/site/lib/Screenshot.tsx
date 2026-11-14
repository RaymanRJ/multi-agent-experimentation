import { useId, useRef } from 'react';
import { Enlarged, ExpandIcon, openSize } from './Enlarge';

/** One screenshot: the file (imported, so the build fingerprints it), its size, and what it shows. */
export interface Shot {
  src: string;
  /** Its pixels, and how many of them made one on the screen it was taken from (2 for the minds panel, 1 for the world). */
  width: number;
  height: number;
  density: number;
  /** A screenshot of text opens no smaller than it was on screen; a picture of the world is fitted to the screen. */
  text?: boolean;
  title: string;
  alt: string;
}

/** Screenshots under one caption, side by side when there are two. */
export interface Figure {
  shots: Shot[];
  caption: string;
}

/** A figure of screenshots, each opening full size when clicked. */
export function Screenshots({ figure }: { figure: Figure }) {
  return (
    <figure className={figure.shots.length > 1 ? 'shots pair' : 'shots'}>
      <div className="shots-row">
        {figure.shots.map((shot) => (
          <OneShot key={shot.src} shot={shot} />
        ))}
      </div>
      <figcaption>{figure.caption}</figcaption>
    </figure>
  );
}

function OneShot({ shot }: { shot: Shot }) {
  const id = `shot-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const dialog = useRef<HTMLDialogElement>(null);
  const width = shot.width / shot.density;
  const height = shot.height / shot.density;
  // Text: no smaller than it was on screen, at most half as large again. A picture: no larger than it was taken.
  const size = shot.text ? openSize(width, 1.5 * width, width / height) : openSize(0, width, width / height);
  return (
    <>
      {/* Never wider than it was on screen: stretched, its text would only grow blurred. */}
      <button type="button" className="shot-open" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()} style={{ maxWidth: width }}>
        <img src={shot.src} alt={shot.alt} width={width} height={height} loading="lazy" />
        <span className="enlarge-button shot-hint" aria-hidden="true">
          <ExpandIcon />
          Expand
        </span>
      </button>
      <Enlarged id={id} title={shot.title} dialog={dialog}>
        <div className="enlarge-content" style={size}>
          <img src={shot.src} alt={shot.alt} loading="lazy" />
        </div>
      </Enlarged>
    </>
  );
}
