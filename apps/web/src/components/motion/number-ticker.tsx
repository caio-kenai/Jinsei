'use client';
import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

/** Counts up to a value once it scrolls into view (pattern from Magic UI's Number Ticker). */
export function NumberTicker({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(reduce ? value : 0);
  const spring = useSpring(motionValue, { damping: 40, stiffness: 140 });
  const inView = useInView(ref, { once: true, margin: '0px' });
  const format = (current: number) =>
    current.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, motionValue, value]);
  useEffect(
    () =>
      spring.on('change', (latest) => {
        if (ref.current) ref.current.textContent = format(Number(latest.toFixed(decimals)));
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spring, decimals],
  );
  return (
    <span
      ref={ref}
      className={['number-ticker', className].filter(Boolean).join(' ')}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {format(reduce ? value : 0)}
    </span>
  );
}
