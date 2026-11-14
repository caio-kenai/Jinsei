'use client';
import { MotionConfig } from 'motion/react';

/** Shared motion defaults: quick springs, and no movement for people who ask the OS for less. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.8 }}
    >
      {children}
    </MotionConfig>
  );
}
