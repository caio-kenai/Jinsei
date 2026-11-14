const colors = ['#7050cf', '#e5306f', '#2f7bff', '#f7832b', '#15936a', '#f5c518', '#0e9aa7'];

/**
 * A short confetti burst drawn with plain elements and the Web Animations API,
 * starting from an element when given. Skipped with reduced motion.
 */
export function celebrate(origin?: Element | null, pieces = 70) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = origin?.getBoundingClientRect();
  const x = box ? box.left + box.width / 2 : window.innerWidth / 2;
  const y = box ? box.top + box.height / 2 : window.innerHeight * 0.35;
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
  document.body.appendChild(layer);
  const animations: Promise<unknown>[] = [];
  for (let index = 0; index < pieces; index++) {
    const piece = document.createElement('i');
    const size = 6 + Math.random() * 6;
    piece.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${
      size * (Math.random() > 0.5 ? 0.45 : 1)
    }px;background:${colors[index % colors.length]};border-radius:${Math.random() > 0.6 ? '50%' : '2px'}`;
    layer.appendChild(piece);
    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 260;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 180;
    const spin = (Math.random() - 0.5) * 900;
    animations.push(
      piece.animate(
        [
          { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(${dx}px, ${dy}px) rotate(${spin / 2}deg)`,
            opacity: 1,
            offset: 0.45,
          },
          {
            transform: `translate(${dx * 1.3}px, ${dy + 420}px) rotate(${spin}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 1300 + Math.random() * 700,
          easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
          fill: 'forwards',
        },
      ).finished,
    );
  }
  void Promise.allSettled(animations).then(() => layer.remove());
}
