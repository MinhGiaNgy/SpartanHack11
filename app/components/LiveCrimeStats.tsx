'use client';

import { useCallback, useEffect, useState } from 'react';

type LiveCrimeStatsProps = {
  initialReportsLast24h: number;
  initialVerifiedIncidents: number;
  avgResponse?: string;
};

export default function LiveCrimeStats({
  initialReportsLast24h,
  initialVerifiedIncidents,
  avgResponse = '4 min',
}: LiveCrimeStatsProps) {
  const [reportsLast24h, setReportsLast24h] = useState(initialReportsLast24h);
  const [verifiedIncidents, setVerifiedIncidents] = useState(initialVerifiedIncidents);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();

      if (typeof data?.reportsLast24h === 'number') {
        setReportsLast24h(data.reportsLast24h);
      }
      if (typeof data?.verifiedIncidents === 'number') {
        setVerifiedIncidents(data.verifiedIncidents);
      }
    } catch (error) {
      console.warn('Failed to refresh stats:', error);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshStats, 4000);
    return () => clearInterval(interval);
  }, [refreshStats]);

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
          if (message?.type === 'incident_created') {
            refreshStats();
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
  }, [refreshStats]);

  const crimeStats = [
    { label: 'Reports last 24h', value: reportsLast24h.toString() },
    { label: 'Verified incidents', value: verifiedIncidents.toString() },
    { label: 'Avg response', value: avgResponse },
  ];

  return (
    <div className="reveal grid gap-4 sm:grid-cols-3" style={{ animationDelay: '0.3s' }}>
      {crimeStats.map((stat) => (
        <div key={stat.label} className="panel p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--slate)]">
            {stat.label}
          </p>
          <p className="font-display text-2xl">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
