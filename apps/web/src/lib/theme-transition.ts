import { flushSync } from 'react-dom';

type Mode = 'light' | 'dark' | 'system';

/** Puts the light/dark class on <html> right away (next-themes would only do it in an effect). */
function applyMode(mode: Mode) {
  const dark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(dark ? 'dark' : 'light');
  root.style.colorScheme = dark ? 'dark' : 'light';
}

/**
 * Applies a theme change with a circular reveal that grows from the control the
 * person used (View Transitions, like Magic UI's Animated Theme Toggler).
 * Pass `mode` when the light/dark mode changes, so the new palette is in place
 * before the browser captures the new state. Falls back to an instant change
 * without the API, with reduced motion or on touch screens.
 */
export function transitionTheme(apply: () => void, origin?: Element | null, mode?: Mode) {
  const update = () => {
    if (mode) applyMode(mode);
    apply();
  };
  const doc = document as Document & {
    startViewTransition?: (update: () => void) => {
      ready: Promise<void>;
      finished: Promise<void>;
    };
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (!doc.startViewTransition || reduce || coarse) {
    update();
    return;
  }
  const box = origin?.getBoundingClientRect();
  const x = box ? box.left + box.width / 2 : window.innerWidth / 2;
  const y = box ? box.top + box.height / 2 : window.innerHeight / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  // Color transitions would start from the old palette and leak into the snapshot.
  const root = document.documentElement;
  root.classList.add('theme-switching');
  const transition = doc.startViewTransition(() => flushSync(update));
  void transition.finished
    .catch(() => undefined)
    .finally(() => root.classList.remove('theme-switching'));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 450,
          easing: 'ease-in-out',
          fill: 'forwards',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    })
    .catch(() => undefined);
}
