'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import Map component to avoid SSR issues with Leaflet
const Map = dynamic(() => import('../components/Map'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-stone/30 rounded-[20px] animate-pulse">
            <div className="text-slate font-medium">Loading Map...</div>
        </div>
    )
});

export default function MapPage() {
    return (
        <div className="page p-6 md:p-12">
            <div className="orb one" />
            <div className="orb two" />

            <main className="max-w-6xl mx-auto relative z-10 grid grid-rows-[auto_1fr] h-[calc(100vh-6rem)] gap-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-4xl font-bold text-ink mb-2">Interactive Map</h1>
                        <p className="text-slate max-w-lg">
                            Explore the area and add your own notes to specific locations using the interactive map below.
                        </p>
                    </div>
                    <Link href="/" className="btn btn-ghost hover:bg-white/50">
                        Back to Home
                    </Link>
                </header>

                <div className="panel p-4 h-full min-h-[500px]">
                    <Map />
                </div>
            </main>
        </div>
    );
}
