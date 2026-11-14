import { flushSync } from 'react-dom';

/**
 * Applies a theme change with a circular reveal that grows from the control the
 * person used (Magic UI's Animated Theme Toggler, built on View Transitions).
 * Falls back to an instant change without the API or with reduced motion.
 */
export function transitionTheme(apply: () => void, origin?: Element | null) {
  const doc = document as Document & {
    startViewTransition?: (update: () => void) => { ready: Promise<void> };
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduce) {
    apply();
    return;
  }
  const box = origin?.getBoundingClientRect();
  const x = box ? box.left + box.width / 2 : window.innerWidth - 40;
  const y = box ? box.top + box.height / 2 : 20;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const transition = doc.startViewTransition(() => flushSync(apply));
  void transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      {
        duration: 620,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  });
}
