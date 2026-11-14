'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';

const ease = [0.22, 1, 0.36, 1] as const;

/** Words come into focus one after another (React Bits' Blur Text). */
export function BlurText({ lines, delay = 0 }: { lines: string[]; delay?: number }) {
  let index = 0;
  return (
    <>
      {lines.map((line, lineIndex) => (
        <span key={line} className="blur-line">
          {line.split(' ').map((word, wordIndex, words) => {
            const order = index++;
            return (
              <Fragment key={`${word}-${order}`}>
                <motion.span
                  className="blur-word"
                  initial={{ opacity: 0, filter: 'blur(12px)', y: 14 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  transition={{ duration: 0.7, ease, delay: delay + order * 0.07 }}
                >
                  {word}
                </motion.span>
                {wordIndex < words.length - 1 && ' '}
              </Fragment>
            );
          })}
          {lineIndex < lines.length - 1 && (
            <>
              {' '}
              <br />
            </>
          )}
        </span>
      ))}
    </>
  );
}

/** Cycles through words with a vertical slide (React Bits' Rotating Text). */
export function RotatingWord({ words, interval = 2200 }: { words: string[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % words.length), interval);
    return () => clearInterval(timer);
  }, [interval, reduce, words.length]);
  return (
    <motion.span layout className="rotating-word" aria-hidden="true">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={words[index]}
          className="rotating-word-item"
          initial={{ y: '100%', opacity: 0, filter: 'blur(6px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-100%', opacity: 0, filter: 'blur(6px)' }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

/** The main call to action: animated rainbow border, glow and a passing shine. */
export function GlowButton({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button className={`public-button public-button-large cta-glow ${className}`} onClick={onClick}>
      <span className="cta-aura" aria-hidden="true" />
      <span className="cta-border" aria-hidden="true" />
      <span className="cta-surface" aria-hidden="true">
        <span className="cta-shine" />
      </span>
      <span className="cta-label">
        {children}
        <ArrowRight size={18} className="cta-arrow" />
      </span>
    </button>
  );
}

/** The product preview tilts back and settles flat as it scrolls into view. */
export function ScrollTilt({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.35'] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26 });
  const rotateX = useTransform(progress, [0, 1], [18, 0]);
  const scale = useTransform(progress, [0, 1], [0.93, 1]);
  const y = useTransform(progress, [0, 1], [40, 0]);
  return (
    <div ref={ref} className="scroll-tilt">
      <motion.div style={{ rotateX, scale, y }} className="scroll-tilt-inner">
        {children}
      </motion.div>
    </div>
  );
}

/** A light follows the pointer across the card (Magic UI's Magic Card). */
export function SpotlightCard({ children }: { children: React.ReactNode }) {
  return (
    <article
      className="spotlight-card"
      onPointerMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty('--spot-x', `${event.clientX - box.left}px`);
        event.currentTarget.style.setProperty('--spot-y', `${event.clientY - box.top}px`);
      }}
    >
      {children}
    </article>
  );
}
