import Link from 'next/link';
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
  const body = (
    <>
      <MediaCover title={work.title} url={work.coverUrl} large />
      <h3>{work.title}</h3>
      <p>{[categoryLabels[work.mediaType], work.releaseYear].filter(Boolean).join(' · ')}</p>
      {work.rating !== null && <StarRating value={work.rating} size={11} />}
    </>
  );
  return (
    <article className="public-work">
      {work.workId ? (
        <Link href={`/obras/${work.workId}`} className="public-work-link">
          {body}
        </Link>
      ) : (
        body
      )}
      {children}
    </article>
  );
}
