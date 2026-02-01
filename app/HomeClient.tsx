'use plain';
'use client';

import Link from "next/link";
import LiveCrimeStats from "./components/LiveCrimeStats";
import { useState } from "react";
import dynamic from 'next/dynamic';
import { Incident } from './lib/data';

const Map = dynamic(() => import('./components/Map'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[360px] flex items-center justify-center bg-[var(--stone)]/30 rounded-[20px] animate-pulse">
            <div className="text-[var(--slate)] font-medium">Loading Live Map...</div>
        </div>
    ),
});

interface HomeClientProps {
    initialReportsLast24h: number;
    initialVerifiedIncidents: number;
    // We can pass incidents if we fetch them server side, or fetch them client side.
    // For now let's reuse client side fetch to ensure live updates via websocket or just simple fetch
    // actually MapPageClient fetches incidents. We should probably fetch them here too.
}

export default function HomeClient({ initialReportsLast24h, initialVerifiedIncidents }: HomeClientProps) {
    const [centerTrigger, setCenterTrigger] = useState(0);
    const [incidents, setIncidents] = useState<Incident[]>([]);

    // We need to fetch incidents for the map
    useState(() => {
        fetch('/api/incidents')
            .then(res => res.json())
            .then(data => setIncidents(data))
            .catch(err => console.error("Failed to load map data", err));
    });


    const safetyScores = [
        {
            location: "Wilson Hall",
            grade: "B+",
            score: "6/10",
            note: "Moderate traffic, stay alert after 10pm.",
        },
        {
            location: "Munn Field",
            grade: "A-",
            score: "8/10",
            note: "Well-lit with steady patrols.",
        },
        {
            location: "Grand River Ave",
            grade: "C+",
            score: "5/10",
            note: "Late-night incidents reported.",
        },
        {
            location: "Baker Hall",
            grade: "B",
            score: "6/10",
            note: "Quiet after 10pm, walk with a buddy.",
        },
        {
            location: "River Trail",
            grade: "C",
            score: "4/10",
            note: "Low visibility after dusk.",
        },
        {
            location: "IM West",
            grade: "A",
            score: "8/10",
            note: "High foot traffic until midnight.",
        },
    ];

    return (
        <div className="page">
            <div className="orb one" aria-hidden />
            <div className="orb two" aria-hidden />

            <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8 md:px-10">
                <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--forest)] text-white">
                        SS
                    </div>
                    <div>
                        <p className="font-display text-lg font-semibold tracking-tight">
                            SpartaSafe
                        </p>
                        <p className="text-xs text-[var(--slate)]">
                            MSU · East Lansing Safety Map
                        </p>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-12 md:px-10">
                <section className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="space-y-8">
                        <div className="reveal space-y-4" style={{ animationDelay: "0.1s" }}>
                            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--slate)]">
                                Spartans · Live Safety Intelligence
                            </p>
                            <h1 className="font-display text-4xl leading-tight text-[var(--ink)] md:text-5xl">
                                The East Lansing crime map built for students, with AI hotspot
                                warnings.
                            </h1>
                            <p className="text-base text-[var(--slate)] md:text-lg">
                                Use OpenStreetMap tiles to explore MSU and East Lansing in real
                                time, then review safety scores below the map for every
                                residence hall and hotspot.
                            </p>
                        </div>

                        <div className="reveal flex flex-wrap gap-3" style={{ animationDelay: "0.2s" }}>
                            <Link href="/map"><button className="btn btn-primary">Open live map</button></Link>
                        </div>

                        <LiveCrimeStats
                            initialReportsLast24h={initialReportsLast24h}
                            initialVerifiedIncidents={initialVerifiedIncidents}
                        />

                        <div className="reveal flex flex-wrap gap-2" style={{ animationDelay: "0.35s" }}>
                            <span className="chip">Verified by crowd</span>
                            <span className="chip">Campus safety synced</span>
                            <span className="chip">Smart safe-route nudges</span>
                        </div>
                    </div>

                    <div className="panel p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-display text-xl">Live East Lansing map</h3>
                                <p className="text-sm text-[var(--slate)]">
                                    OpenStreetMap tiles · MSU campus core
                                </p>
                            </div>
                            <button
                                className="btn btn-ghost"
                                onClick={() => setCenterTrigger(Date.now())}
                            >
                                Center on me
                            </button>
                        </div>

                        <div className="map-frame mt-5 h-[400px] relative w-full">
                            <Map
                                incidents={incidents}
                                centerTrigger={centerTrigger}
                                readOnly={true}
                            />
                            <div className="map-overlay" />
                            <div className="map-badge">Live Feed</div>
                        </div>

                        <div className="mt-6">
                            <div className="flex items-center justify-between">
                                <h4 className="font-display text-lg">Campus safety scores</h4>
                                <span className="chip">Updated 6 min ago</span>
                            </div>
                            <div className="stat-grid mt-4 sm:grid-cols-2">
                                {safetyScores.map((stat) => (
                                    <div key={stat.location} className="stat-card">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-semibold text-[var(--ink)]">
                                                    {stat.location}
                                                </p>
                                                <p className="text-xs text-[var(--slate)]">{stat.note}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="grade-chip">{stat.grade}</span>
                                                <p className="mt-2 text-sm font-semibold text-[var(--graphite)]">
                                                    {stat.score}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-16 grid gap-6 md:grid-cols-3">
                    <div className="panel p-6">
                        <h3 className="font-display text-xl">AI hotspot watch</h3>
                        <p className="mt-2 text-sm text-[var(--slate)]">
                            Predicts the next high-risk block based on time, density, and
                            verified reports.
                        </p>
                    </div>
                    <div className="panel p-6">
                        <h3 className="font-display text-xl">Crime trend signals</h3>
                        <p className="mt-2 text-sm text-[var(--slate)]">
                            Compare week-over-week changes for MSU corridors and off-campus
                            housing.
                        </p>
                    </div>
                    <div className="panel p-6">
                        <h3 className="font-display text-xl">Push safety alerts</h3>
                        <p className="mt-2 text-sm text-[var(--slate)]">
                            Get warned instantly when you enter a risk zone or late-night
                            cluster.
                        </p>
                    </div>
                </section>
            </main>

            <footer className="mx-auto w-full max-w-6xl px-6 pb-10 text-sm text-[var(--slate)] md:px-10">
                Built at SpartaHack · Powered by student reports and AI signal detection.
            </footer>

        </div>
    );
}
