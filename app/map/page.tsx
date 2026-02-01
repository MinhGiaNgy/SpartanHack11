import { Suspense } from 'react';
import MapPageClient from './MapPageClient';

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="page p-6 md:p-12 h-screen flex items-center justify-center">
          <div className="text-[var(--slate)] font-medium">Loading map…</div>
        </div>
      }
    >
      <MapPageClient />
    </Suspense>
  );
}
