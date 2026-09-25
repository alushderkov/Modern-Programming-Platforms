import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { fetchPosterObjectUrl } from '../api';

interface Props {
  filmId: string;
  updatedAt: string;
  hasPoster: boolean;
}

export function PosterImage({ filmId, updatedAt, hasPoster }: Props): ReactNode {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPoster) {
      setSrc(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    void fetchPosterObjectUrl(filmId).then((url) => {
      if (cancelled) {
        if (url) {
          URL.revokeObjectURL(url);
        }
        return;
      }
      objectUrl = url;
      setSrc(url);
    });
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [filmId, updatedAt, hasPoster]);

  if (!src) {
    return <span>без кадра</span>;
  }

  return <img src={src} alt="" />;
}
