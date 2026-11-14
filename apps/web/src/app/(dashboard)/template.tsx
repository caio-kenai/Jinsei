'use client';
import { motion } from 'motion/react';

/** Each workspace screen settles in with a short fade, so navigation feels continuous. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="page-transition"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
