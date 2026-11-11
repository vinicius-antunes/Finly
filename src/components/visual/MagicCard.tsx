// Finly-specific reduction of React Bits Magic Bento (David Haz).
// Retains pointer-relative spotlight/border model; omits springs, tilt, waves,
// particles and the sample content. MIT + Commons Clause, docs/licenses/react-bits.txt.
import type { ComponentProps, PointerEvent } from 'react';
import { Card } from '@/components/ui/card';
export function MagicCard({ className = '', ...props }: ComponentProps<typeof Card>) {
  function point(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mb-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--mb-y', `${event.clientY - rect.top}px`);
    card.dataset.active = 'true';
  }
  return <Card {...props} className={`magic-card ${className}`}
    onPointerMove={point} onPointerLeave={event => { delete event.currentTarget.dataset.active; }} />;
}
