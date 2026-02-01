import Link from "next/link";
import { prisma } from "../lib/prisma";

export default async function Home() {
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [reportsLast24h, verifiedIncidents] = await prisma.$transaction([
    prisma.crimeIncident.count({
      where: {
        OR: [
          { occurredAt: { gte: since } },
          { reportedAt: { gte: since } },
          { createdAt: { gte: since } },
        ],
      },
    }),
    prisma.crimeIncident.count({
      where: { source: "msu_clery" },
    }),
  ]);

  const crimeStats = [
    { label: "Reports last 24h", value: reportsLast24h.toString() },
    { label: "Verified incidents", value: verifiedIncidents.toString() },
    { label: "Avg response", value: "4 min" },
  ];

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

            <div className="reveal grid gap-4 sm:grid-cols-3" style={{ animationDelay: "0.3s" }}>
              {crimeStats.map((stat) => (
                <div key={stat.label} className="panel p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--slate)]">
                    {stat.label}
                  </p>
                  <p className="font-display text-2xl">{stat.value}</p>
                </div>
              ))}
            </div>

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
              <button className="btn btn-ghost">Center on me</button>
            </div>

            <div className="map-frame mt-5">
              <iframe
                title="OpenStreetMap East Lansing"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-84.511%2C42.715%2C-84.455%2C42.760&layer=mapnik&marker=42.736%2C-84.483"
              />
              <div className="map-overlay" />
              <div className="map-badge">Open Map API</div>
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
