'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState, useEffect } from 'react';

// Import Types and Dummy Data (in a real app, data would be fetched here)
import { DUMMY_DATA, Incident } from '../lib/data';

// Dynamically import Map component to avoid SSR issues with Leaflet
const Map = dynamic(() => import('../components/Map'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-[var(--stone)]/30 rounded-[20px] animate-pulse">
            <div className="text-[var(--slate)] font-medium">Loading Map...</div>
        </div>
    )
});

export default function MapPage() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
    const [filterDuration, setFilterDuration] = useState<'1day' | '1week' | '1month' | '3months' | 'all'>('1month');

    // Filter Incidents Logic
    const getFilteredIncidents = () => {
        const now = new Date();
        const msPerDay = 24 * 60 * 60 * 1000;

        return incidents.filter(incident => {
            const incidentDate = new Date(incident.timestamp);
            const diffTime = Math.abs(now.getTime() - incidentDate.getTime());
            const diffDays = Math.ceil(diffTime / msPerDay);

            switch (filterDuration) {
                case '1day': return diffDays <= 1;
                case '1week': return diffDays <= 7;
                case '1month': return diffDays <= 30;
                case '3months': return diffDays <= 90;
                case 'all': return true;
                default: return true;
            }
        });
    };

    const filteredIncidents = getFilteredIncidents();

    // Fetch Incidents on Load
    useEffect(() => {
        const fetchIncidents = async () => {
            try {
                const res = await fetch('/api/incidents');
                if (res.ok) {
                    const data = await res.json();
                    setIncidents(data);
                }
            } catch (error) {
                console.error("Error fetching incidents:", error);
            }
        };
        fetchIncidents();
    }, []);

    // Handlers
    const handleIncidentSelect = (incident: Incident) => {
        setActiveIncident(incident);
    };

    const handleIncidentAdded = (newIncident: Incident) => {
        setIncidents(prev => [newIncident, ...prev]);
        setActiveIncident(newIncident); // Optional: select the new incident
    };

    return (
        <div className="page p-6 md:p-12 h-screen flex flex-col overflow-hidden">
            <div className="orb one" />
            <div className="orb two" />

            <header className="flex-none flex items-center justify-between mb-6 relative z-10">
                <div>
                    <h1 className="font-display text-4xl font-bold text-[var(--ink)] mb-2">Interactive Map</h1>
                    <p className="text-[var(--slate)] max-w-lg">
                        Explore reports and add your own.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        className="btn btn-primary"
                        onClick={() => alert('Click on any location on the map to manually report an incident.')}
                    >
                        Report Incident
                    </button>
                    <Link href="/" className="btn btn-ghost hover:bg-white/50">
                        Back to Home
                    </Link>
                </div>
            </header>

            <main className="flex-1 relative z-10 grid grid-cols-1 md:grid-cols-[350px_1fr] gap-6 min-h-0">
                {/* Sidebar Panel */}
                <div className="panel flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b border-black/5 bg-white/50 backdrop-blur-sm flex justify-between items-center">
                        <div>
                            <h2 className="font-bold text-lg text-[var(--forest)]">Recent Reports</h2>
                            <p className="text-xs text-[var(--slate)]">select an item to view on map</p>
                        </div>
                        <select
                            value={filterDuration}
                            onChange={(e) => setFilterDuration(e.target.value as any)}
                            className="bg-white border border-black/10 rounded-lg text-xs px-2 py-1 text-[var(--ink)] focus:outline-none focus:border-[var(--forest)]"
                        >
                            <option value="1day">24 Hours</option>
                            <option value="1week">1 Week</option>
                            <option value="1month">1 Month</option>
                            <option value="3months">3 Months</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {filteredIncidents.map((incident) => (
                            <button
                                key={incident.id}
                                onClick={() => handleIncidentSelect(incident)}
                                className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group
                  ${activeIncident?.id === incident.id
                                        ? 'bg-[var(--forest)] text-white border-[var(--forest)] shadow-lg scale-[1.02]'
                                        : 'bg-white border-black/5 hover:border-[var(--forest)] hover:shadow-md'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full
                    ${activeIncident?.id === incident.id
                                            ? 'bg-white/20 text-white'
                                            : incident.type === 'robbery' || incident.type === 'assault'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                        }`}
                                    >
                                        {incident.type}
                                    </span>
                                    <span className={`text-[10px] ${activeIncident?.id === incident.id ? 'text-white/70' : 'text-[var(--slate)]'}`}>
                                        {new Date(incident.timestamp).toLocaleDateString()}
                                    </span>
                                </div>

                                <h3 className={`font-bold mb-1 ${activeIncident?.id === incident.id ? 'text-white' : 'text-[var(--ink)]'}`}>
                                    {incident.name}
                                </h3>

                                <p className={`text-sm line-clamp-2 ${activeIncident?.id === incident.id ? 'text-white/80' : 'text-[var(--slate)]'}`}>
                                    {incident.details}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Map Panel */}
                <div className="panel p-2 h-full min-h-[400px] overflow-hidden">
                    <Map
                        incidents={filteredIncidents}
                        activeIncident={activeIncident}
                        onIncidentClick={handleIncidentSelect}
                        onIncidentAdded={handleIncidentAdded}
                    />
                </div>
            </main>
        </div>
    );
}
