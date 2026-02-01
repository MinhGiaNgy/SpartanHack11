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

    // WebSocket: live incident updates
    useEffect(() => {
        let active = true;
        let socket: WebSocket | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

        const connect = () => {
            if (!active) return;
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            socket = new WebSocket(`${protocol}://${window.location.host}/ws`);

            socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message?.type === 'incident_created' && message.payload) {
                        const incoming = message.payload as Incident;
                        setIncidents(prev => {
                            if (prev.some(item => item.id === incoming.id)) return prev;
                            return [incoming, ...prev];
                        });
                    }
                } catch (error) {
                    console.warn('Invalid WS message:', error);
                }
            };

            socket.onerror = () => {
                socket?.close();
            };

            socket.onclose = () => {
                if (!active) return;
                reconnectTimer = setTimeout(connect, 2000);
            };
        };

        connect();

        return () => {
            active = false;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            socket?.close();
        };
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
                    <div className="p-4 border-b border-black/5 bg-white/50 backdrop-blur-sm">
                        <h2 className="font-bold text-lg text-[var(--forest)]">Recent Reports</h2>
                        <p className="text-xs text-slate">select an item to view on map</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {incidents.map((incident) => (
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
                        incidents={incidents}
                        activeIncident={activeIncident}
                        onIncidentClick={handleIncidentSelect}
                        onIncidentAdded={handleIncidentAdded}
                    />
                </div>
            </main>
        </div>
    );
}
