'use client';
import { motion, type HTMLMotionProps } from 'motion/react';

/** Fades and lifts content in when it enters the viewport (Magic UI's Blur Fade, kept subtle). */
export function Reveal({
  delay = 0,
  children,
  ...props
}: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1], delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
