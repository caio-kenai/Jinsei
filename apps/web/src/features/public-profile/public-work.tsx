import { categoryLabels, type PublicWork } from '@jinsei/contracts';
import { StarRating } from '@/components/shared/star-rating';
import { MediaCover } from '@/features/library/media-cover';

export function PublicWorkCard({
  work,
  children,
}: {
  work: PublicWork;
  children?: React.ReactNode;
}) {
  return (
    <article className="public-work">
      <MediaCover title={work.title} url={work.coverUrl} large />
      <h3>{work.title}</h3>
      <p>{[categoryLabels[work.mediaType], work.releaseYear].filter(Boolean).join(' · ')}</p>
      {work.rating !== null && <StarRating value={work.rating} size={11} />}
      {children}
    </article>
  );
}
