import {
  BookMarked,
  BookOpen,
  Clapperboard,
  Film,
  Gamepad2,
  Tv,
  type LucideIcon,
} from 'lucide-react';
import type { MediaType } from '@jinsei/contracts';

export const categoryIcons: Record<MediaType, LucideIcon> = {
  games: Gamepad2,
  anime: Tv,
  manga: BookOpen,
  movies: Film,
  series: Clapperboard,
  books: BookMarked,
};
