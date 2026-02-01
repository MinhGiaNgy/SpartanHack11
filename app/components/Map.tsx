'use client';

import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import { useState, useRef, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Incident, IncidentForm, IncidentType } from '../lib/data';



import Supercluster from 'supercluster';

// ... (previous imports)

// Helper component to fly to active incident
function MapController({ activeIncident }: { activeIncident: Incident | null }) {
    const map = useMap();

    useEffect(() => {
        if (activeIncident) {
            const zoom = 16;
            const targetPoint = map.project([activeIncident.location.lat, activeIncident.location.lng], zoom);
            targetPoint.y -= 150; // Shift for popup visibility
            const targetLatLng = map.unproject(targetPoint, zoom);

            map.flyTo(targetLatLng, zoom, {
                animate: true,
                duration: 1.5
            });
        }
    }, [activeIncident, map]);

    return null;
}

function UserLocationController() {
    const map = useMap();

    useEffect(() => {
        map.locate().on("locationfound", function (e) {
            map.flyTo(e.latlng, 15); // Zoom level 15
        });
    }, [map]);

    return null;
}

interface LocationMarkerProps {
    incidents: Incident[];
    activeIncident: Incident | null;
    onIncidentClick: (incident: Incident) => void;
    onIncidentAdded: (incident: Incident) => void;
    autoReport?: boolean;
}

// Component to handle map clicks and rendering
function MapLayers({ incidents, activeIncident, onIncidentClick, onIncidentAdded, autoReport }: LocationMarkerProps) {
    const map = useMap();
    const [position, setPosition] = useState<L.LatLng | null>(null);
    const [form, setForm] = useState<IncidentForm>({
        name: '',
        type: 'other',
        details: '',
        image: ''
    });
    const [submittedData, setSubmittedData] = useState<any>(null);

    // Clustering State
    const [clusters, setClusters] = useState<any[]>([]);
    const superclusterRef = useRef<Supercluster>(new Supercluster({
        radius: 60, // Cluster radius in pixels
        maxZoom: 15, // Max zoom to cluster points on
        map: (props) => ({
            severityScore: (props.type === 'robbery' || props.type === 'assault') ? 2 : 1,
            timestamps: [props.timestamp]
        }),
        reduce: (accum, props) => {
            accum.severityScore = Math.max(accum.severityScore, props.severityScore);
            accum.timestamps = accum.timestamps.concat(props.timestamps);
        }
    }));

    // Check if cluster has >= 4 incidents within any 3-day (72h) window
    const hasHighDensityInTimeWindow = (timestamps: string[]) => {
        if (timestamps.length < 4) return false;

        const dates = timestamps.map(t => new Date(t).getTime()).sort((a, b) => a - b);
        const windowMs = 72 * 60 * 60 * 1000; // 72 hours in ms

        // Sliding window check
        for (let i = 0; i <= dates.length - 4; i++) {
            const start = dates[i];
            const end = dates[i + 3]; // The 4th incident in the window
            if (end - start <= windowMs) {
                return true;
            }
        }
        return false;
    };


    // Auto-report logic
    useEffect(() => {
        if (autoReport && map) {
            map.locate().on("locationfound", (e) => {
                setPosition(e.latlng);
                map.flyTo(e.latlng, 16);
            });
        }
    }, [autoReport, map]);

    // Update Supercluster when data changes
    useEffect(() => {
        const points = incidents.map(incident => ({
            type: 'Feature' as const,
            properties: { cluster: false, incidentId: incident.id, ...incident },
            geometry: {
                type: 'Point' as const,
                coordinates: [incident.location.lng, incident.location.lat]
            }
        }));

        superclusterRef.current.load(points);
        updateClusters();
    }, [incidents]);

    // Update clusters on map move
    const updateClusters = () => {
        if (!map) return;
        const bounds = map.getBounds();
        const zoom = map.getZoom();

        setClusters(superclusterRef.current.getClusters(
            [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
            zoom
        ));
    };

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            setForm({ name: '', type: 'other', details: '', image: '' });
            setSubmittedData(null);

            // Shift map center logic
            const zoom = map.getZoom();
            const targetPoint = map.project(e.latlng, zoom);
            targetPoint.y -= 250;
            const targetLatLng = map.unproject(targetPoint, zoom);
            map.flyTo(targetLatLng, zoom);
        },
        moveend: updateClusters
    });

    const newMarkerRef = useRef<L.Marker>(null);
    useEffect(() => {
        if (position && newMarkerRef.current) {
            const timer = setTimeout(() => {
                newMarkerRef.current?.openPopup();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [position]);

    // Helper to get cluster radius (distance to furthest leaf)
    const getClusterRadius = (clusterId: number, center: [number, number]) => {
        const leaves = superclusterRef.current.getLeaves(clusterId, Infinity);
        if (leaves.length === 0) return 0;

        // Calculate max distance from center in meters
        const centerLatLng = L.latLng(center[1], center[0]);
        let maxDist = 0;

        leaves.forEach(leaf => {
            const leafLatLng = L.latLng(leaf.geometry.coordinates[1], leaf.geometry.coordinates[0]);
            const dist = centerLatLng.distanceTo(leafLatLng);
            if (dist > maxDist) maxDist = dist;
        });

        return Math.max(maxDist + 50, 150); // Minimum 150m buffer
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!position) return;

        const payload = {
            location: { lat: position.lat, lng: position.lng },
            ...form
        };

        try {
            const res = await fetch('/api/incidents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const savedIncident = await res.json();
                console.log('Incident Saved:', savedIncident);
                setSubmittedData(savedIncident);

                // Update parent state
                onIncidentAdded(savedIncident);
            } else {
                alert("Failed to save report.");
            }
        } catch (err) {
            console.error(err);
            alert("Error submitting report.");
        }
    };

    // Fix for Default Icon (useEffect) ...
    useEffect(() => {
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
    }, []);

    const markersRef = useRef<{ [key: string | number]: L.Marker | null }>({});
    useEffect(() => {
        if (activeIncident && markersRef.current[activeIncident.id]) {
            markersRef.current[activeIncident.id]?.openPopup();
        }
    }, [activeIncident]);


    return (
        <>
            {clusters.map((cluster) => {
                const [lng, lat] = cluster.geometry.coordinates;
                const { cluster: isCluster, point_count: pointCount, incidentId } = cluster.properties;

                if (isCluster) {
                    const isHighSeverity = cluster.properties.severityScore >= 2;
                    const isDangerZone = hasHighDensityInTimeWindow(cluster.properties.timestamps);
                    const radius = isDangerZone
                        ? getClusterRadius(cluster.id, [lng, lat])
                        : 60;

                    const opacity = isDangerZone ? 0.3 : 0.15;
                    return (
                        <Circle
                            key={`cluster-${cluster.id}`}
                            center={[lat, lng]}
                            pathOptions={{
                                color: isHighSeverity ? '#ef4444' : '#eab308',
                                fillColor: isHighSeverity ? '#ef4444' : '#eab308',
                                fillOpacity: opacity,
                                stroke: false
                            }}
                            radius={radius}
                            eventHandlers={{
                                click: () => {
                                    const expansionZoom = Math.min(
                                        superclusterRef.current.getClusterExpansionZoom(cluster.id),
                                        17
                                    );
                                    map.setView([lat, lng], expansionZoom, { animate: true });
                                }
                            }}
                        />
                    );
                }

                const incident = incidents.find(i => i.id === incidentId);
                if (!incident) return null;

                const isHighSeverity = incident.type === 'robbery' || incident.type === 'assault';

                return (
                    <div key={`incident-${incident.id}`}>
                        <Circle
                            center={[incident.location.lat, incident.location.lng]}
                            pathOptions={{
                                color: isHighSeverity ? '#ef4444' : '#eab308',
                                fillColor: isHighSeverity ? '#ef4444' : '#eab308',
                                fillOpacity: 0.2,
                                stroke: false
                            }}
                            radius={isHighSeverity ? 300 : 150}
                        />
                        <Marker
                            position={[incident.location.lat, incident.location.lng]}
                            ref={el => { markersRef.current[incident.id] = el; }}
                            eventHandlers={{
                                click: () => onIncidentClick(incident)
                            }}
                        >
                            <Popup minWidth={280}>
                                <div className="p-1 space-y-2">
                                    {incident.image && (
                                        <div className="w-full h-32 mb-2 rounded-lg overflow-hidden relative bg-[var(--stone)]">
                                            <img src={incident.image} alt="Incident" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-3 h-3 rounded-full ${isHighSeverity ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                        <h3 className="font-bold text-lg leading-none">{incident.name}</h3>
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--slate)]">{incident.type}</p>
                                    <p className="text-sm text-[var(--ink)] bg-[var(--stone)]/30 p-2 rounded border border-[var(--stone)]">{incident.details}</p>
                                    <p className="text-[10px] text-[var(--slate)]/80 text-right">{new Date(incident.timestamp).toLocaleDateString()}</p>
                                </div>
                            </Popup>
                        </Marker>
                    </div>
                );
            })}

            {position && (
                <Marker position={position} ref={newMarkerRef}>
                    <Popup minWidth={300}>
                        <div className="p-1">
                            {submittedData ? (
                                <div className="space-y-2">
                                    <h3 className="font-bold text-lg">{submittedData.name}</h3>
                                    <p className="text-[var(--slate)]">{submittedData.details}</p>
                                    <button onClick={() => setSubmittedData(null)} className="text-xs text-[var(--forest)] hover:underline w-full">Edit Report</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-3">
                                    <h3 className="font-semibold border-b pb-2">Report Incident</h3>
                                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Title" className="w-full text-sm p-2 border rounded text-[var(--ink)] placeholder-[var(--slate)]/70" />
                                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} className="w-full text-sm p-2 border rounded bg-white text-[var(--ink)]">
                                        <option value="other">Other</option>
                                        <option value="robbery">Robbery</option>
                                        <option value="assault">Assault</option>
                                        <option value="harassment">Harassment</option>
                                    </select>
                                    <textarea required value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} placeholder="Details" className="w-full text-sm p-2 border rounded text-[var(--ink)] placeholder-[var(--slate)]/70" rows={2} />
                                    <button type="submit" className="w-full py-2 bg-[var(--forest)] text-white rounded text-sm font-semibold hover:bg-[var(--forest-dark)] transition-colors">Submit</button>
                                </form>
                            )}
                        </div>
                    </Popup>
                </Marker>
            )}
        </>
    );
}

interface MapProps {
    incidents?: Incident[];
    activeIncident?: Incident | null;
    onIncidentClick?: (incident: Incident) => void;
    onIncidentAdded?: (incident: Incident) => void;
    autoReport?: boolean;
}

export default function Map({ incidents = [], activeIncident = null, onIncidentClick = () => { }, onIncidentAdded = () => { }, autoReport = false }: MapProps) {
    // Default position (Lansing/East Lansing area for SpartanHack)
    const defaultPosition: [number, number] = [42.7284, -84.4805];

    return (
        <div className="w-full h-full relative z-0">
            <MapContainer
                center={defaultPosition}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', borderRadius: '20px', zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController activeIncident={activeIncident} />
                <UserLocationController />
                <MapLayers
                    incidents={incidents}
                    activeIncident={activeIncident}
                    onIncidentClick={onIncidentClick}
                    onIncidentAdded={onIncidentAdded}
                    autoReport={autoReport}
                />
            </MapContainer>
        </div>
    );
}
