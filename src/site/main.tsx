import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { loadDoc } from './lib/docs';
import { legacyPath, parse } from './lib/route';
import './styles.css';

// An old hash address (#/lessons) moves to its path (/lessons) before anything draws.
const moved = legacyPath(location.hash);
if (moved) history.replaceState(null, '', moved);

// React draws over the pre-rendered page rather than hydrating it. A doc is loaded first, so its text is there on the
// first draw instead of "Loading…".
const route = parse(location.pathname, location.hash);
const ready = route.page === 'doc' ? loadDoc(route.path) : Promise.resolve(null);

ready.finally(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
