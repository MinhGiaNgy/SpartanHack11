'use client';

import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { AlertTriangle, Siren, Megaphone, Car } from 'lucide-react';

import { DUMMY_DATA, Incident } from '../lib/data';

const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--stone)]/30 rounded-[20px] animate-pulse">
      <div className="text-[var(--slate)] font-medium">Loading Map...</div>
    </div>
  ),
});

export default function MapPageClient() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [filterDuration, setFilterDuration] = useState<
    '1day' | '1week' | '1month' | '3months' | 'all'
  >('1month');

  const searchParams = useSearchParams();
  const autoReport = searchParams.get('action') === 'report';

  const getFilteredIncidents = () => {
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    return incidents.filter((incident) => {
      const incidentDate = new Date(incident.timestamp);
      const diffTime = Math.abs(now.getTime() - incidentDate.getTime());
      const diffDays = Math.ceil(diffTime / msPerDay);

      switch (filterDuration) {
        case '1day':
          return diffDays <= 1;
        case '1week':
          return diffDays <= 7;
        case '1month':
          return diffDays <= 30;
        case '3months':
          return diffDays <= 90;
        case 'all':
          return true;
        default:
          return true;
      }
    });
  };

  const filteredIncidents = getFilteredIncidents();

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await fetch('/api/incidents');
        if (res.ok) {
          const data = await res.json();
          setIncidents(data);
        }
      } catch (error) {
        console.error('Error fetching incidents:', error);
      }
    };
    fetchIncidents();
  }, []);

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
            setIncidents((prev) => {
              if (prev.some((item) => item.id === incoming.id)) return prev;
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

  const handleIncidentSelect = (incident: Incident) => {
    setActiveIncident(incident);
  };

  const handleIncidentAdded = (newIncident: Incident) => {
    setIncidents((prev) => {
      if (prev.some((item) => item.id === newIncident.id)) return prev;
      return [newIncident, ...prev];
    });
    setActiveIncident(newIncident);
  };

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case 'robbery':
      case 'assault':
        return <Siren className="w-5 h-5 text-red-600" />;
      case 'traffic':
        return <Car className="w-5 h-5 text-orange-600" />;
      case 'harassment':
        return <Megaphone className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    }
  };

  return (
    <div className="page p-3 md:p-12 h-screen flex flex-col overflow-hidden">
      <div className="orb one" />
      <div className="orb two" />

      <header className="flex-none flex items-center justify-between mb-6 relative z-10">
        <div>
          <h1 className="font-display text-4xl font-bold text-[var(--ink)] mb-2">
            Interactive Map
          </h1>
          <p className="text-[var(--slate)] max-w-lg">
            Explore reports and add your own.
          </p>
        </div>
        <Link href="/" prefetch={false} className="btn btn-ghost hover:bg-white/50">
          Back to Home
        </Link>
      </header>

      {/* Floating Report Button */}
      <button
        className="fixed bottom-24 right-6 z-50 bg-[var(--forest)] text-white shadow-lg rounded-full px-4 py-3 font-semibold text-sm flex items-center gap-2 hover:bg-[var(--forest-dark)] hover:scale-105 transition-all"
        onClick={() =>
          alert('Click on any location on the map to manually report an incident.')
        }
      >
        <span className="text-xl leading-none">+</span>
        Report Incident
      </button>

      <main className="flex-1 relative z-10 flex flex-col-reverse md:grid md:grid-cols-[350px_1fr] gap-4 md:gap-6 min-h-0 overflow-hidden">
        <div className="panel flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 border-b border-black/5 bg-white/50 backdrop-blur-sm flex justify-between items-center flex-none">
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
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full
                    ${activeIncident?.id === incident.id
                        ? 'bg-white/20 text-white'
                        : incident.type === 'robbery' || incident.type === 'assault'
                          ? 'bg-red-100 text-red-700'
                          : incident.type === 'traffic'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}
                  >
                    {incident.type}
                  </span>
                  <span
                    className={`text-[10px] ${activeIncident?.id === incident.id
                      ? 'text-white/70'
                      : 'text-[var(--slate)]'
                      }`}
                  >
                    {new Date(incident.timestamp).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0">{getIncidentIcon(incident.type)}</div>
                  <div>
                    <h3
                      className={`font-bold mb-1 ${activeIncident?.id === incident.id ? 'text-white' : 'text-[var(--ink)]'
                        }`}
                    >
                      {incident.name}
                    </h3>

                    <p
                      className={`text-sm line-clamp-2 ${activeIncident?.id === incident.id
                        ? 'text-white/80'
                        : 'text-[var(--slate)]'
                        }`}
                    >
                      {incident.details}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="panel p-2 h-[45vh] md:h-full min-h-[300px] flex-none md:flex-auto overflow-hidden">
          <Map
            incidents={filteredIncidents}
            activeIncident={activeIncident}
            onIncidentClick={handleIncidentSelect}
            onIncidentAdded={handleIncidentAdded}
            autoReport={autoReport}
          />
        </div>
      </main>
    </div >
  );
}
