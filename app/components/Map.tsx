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

interface LocationMarkerProps {
    incidents: Incident[];
    activeIncident: Incident | null;
    onIncidentClick: (incident: Incident) => void;
}

// Component to handle map clicks and rendering
function MapLayers({ incidents, activeIncident, onIncidentClick }: LocationMarkerProps) {
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

    // Initial load
    useEffect(() => {
        updateClusters();
    }, []);

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

    // ... (handleImageChange, handleSubmit, etc.)
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // ... same as before
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm(prev => ({ ...prev, image: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!position) return;
        const data = {
            location: { lat: position.lat, lng: position.lng },
            ...form,
            timestamp: new Date().toISOString()
        };
        console.log('Incident Report JSON:', JSON.stringify(data, null, 2));
        setSubmittedData(data);
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

    const newMarkerRef = useRef<L.Marker>(null);
    useEffect(() => {
        if (position && newMarkerRef.current) newMarkerRef.current.openPopup();
    }, [position]);

    const markersRef = useRef<{ [key: number]: L.Marker | null }>({});
    useEffect(() => {
        if (activeIncident && markersRef.current[activeIncident.id]) {
            markersRef.current[activeIncident.id]?.openPopup();
        }
    }, [activeIncident]);


    return (
        <>
            {/* Render Clusters and Points */}
            {clusters.map((cluster) => {
                const [lng, lat] = cluster.geometry.coordinates;
                const { cluster: isCluster, point_count: pointCount, incidentId } = cluster.properties;

                if (isCluster) {
                    const isHighSeverity = cluster.properties.severityScore >= 2;
                    // Density & Time Threshold Logic
                    const isDangerZone = hasHighDensityInTimeWindow(cluster.properties.timestamps);

                    // If high density in time, calculate full radius. If not, use small fixed radius.
                    const radius = isDangerZone
                        ? getClusterRadius(cluster.id, [lng, lat])
                        : 60; // Small fixed radius for low density/spread out clusters

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
                                    // Zoom in on click
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

                // It's a single point (Leaf)
                const incident = incidents.find(i => i.id === incidentId);
                if (!incident) return null;

                const isHighSeverity = incident.type === 'robbery' || incident.type === 'assault';

                return (
                    <div key={`incident-${incident.id}`}>
                        {/* Danger Zone Circle for single point */}
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
                        {/* The Marker */}
                        <Marker
                            position={[incident.location.lat, incident.location.lng]}
                            ref={el => { markersRef.current[incident.id] = el; }}
                            eventHandlers={{
                                click: () => onIncidentClick(incident)
                            }}
                        >
                            <Popup minWidth={280}>
                                {/* ... Popup Content (Duplicated from before, abbreviated here for brevity if needed) ... */}
                                <div className="p-1 space-y-2">
                                    {incident.image && (
                                        <div className="w-full h-32 mb-2 rounded-lg overflow-hidden relative bg-gray-100">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={incident.image} alt="Incident" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-3 h-3 rounded-full ${isHighSeverity ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                        <h3 className="font-bold text-lg leading-none">{incident.name}</h3>
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{incident.type}</p>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">{incident.details}</p>
                                    <p className="text-[10px] text-gray-400 text-right">{new Date(incident.timestamp).toLocaleDateString()}</p>
                                </div>
                            </Popup>
                        </Marker>
                    </div>
                );
            })}

            {/* Current "New Report" Marker */}
            {position && (
                <Marker position={position} ref={newMarkerRef}>
                    <Popup minWidth={300}>
                        {/* ... Form Content ... */}
                        <div className="p-1">
                            {/* ... same logic as before ... */}
                            {submittedData ? (
                                <div className="space-y-2">
                                    {/* ... Data Preview ... */}
                                    <h3 className="font-bold text-lg">{submittedData.name}</h3>
                                    <p className="text-gray-600">{submittedData.details}</p>
                                    <button onClick={() => setSubmittedData(null)} className="text-xs text-forest hover:underline w-full">Edit Report</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-3">
                                    <h3 className="font-semibold border-b pb-2">Report Incident</h3>

                                    {/* Image Upload */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600">Evidence</label>
                                        <div className="flex gap-2">
                                            <label className="flex-1 cursor-pointer p-2 border border-dashed rounded hover:bg-gray-50 flex justify-center">
                                                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                                <span className="text-xs text-gray-500">{form.image ? 'Change' : 'Upload'}</span>
                                            </label>
                                        </div>
                                        {form.image && <img src={form.image} className="h-10 w-full object-cover rounded mt-1" />}
                                    </div>

                                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Title" className="w-full text-sm p-2 border rounded" />
                                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} className="w-full text-sm p-2 border rounded bg-white">
                                        <option value="other">Other</option>
                                        <option value="robbery">Robbery</option>
                                        <option value="assault">Assault</option>
                                        <option value="harassment">Harassment</option>
                                    </select>
                                    <textarea required value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} placeholder="Details" className="w-full text-sm p-2 border rounded" rows={2} />
                                    <button type="submit" className="w-full py-2 bg-forest text-white rounded text-sm font-semibold">Submit</button>
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
}

export default function Map({ incidents = [], activeIncident = null, onIncidentClick = () => { } }: MapProps) {
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
                <MapLayers
                    incidents={incidents}
                    activeIncident={activeIncident}
                    onIncidentClick={onIncidentClick}
                />
            </MapContainer>
        </div>
    );
}
