'use client';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { useState, useRef, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const customIcon = new L.Icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

type IncidentType = 'robbery' | 'assault' | 'harassment' | 'other';

interface IncidentForm {
    name: string;
    type: IncidentType;
    details: string;
}

const DUMMY_DATA: (IncidentForm & { id: number, location: { lat: number, lng: number }, timestamp: string })[] = [
    {
        id: 1,
        name: 'Bike Stolen',
        type: 'robbery',
        details: 'My Trek bike was cut from the lock outside the library.',
        location: { lat: 42.7290, lng: -84.4810 },
        timestamp: '2023-10-25T14:30:00Z'
    },
    {
        id: 2,
        name: 'Loud Harassment',
        type: 'harassment',
        details: 'Group of people yelling at passersby near the union.',
        location: { lat: 42.7305, lng: -84.4825 },
        timestamp: '2023-10-26T18:15:00Z'
    },
    {
        id: 3,
        name: 'Assault Reported',
        type: 'assault',
        details: 'Physical altercation reported late night.',
        location: { lat: 42.7265, lng: -84.4780 },
        timestamp: '2023-10-27T02:00:00Z'
    }
];

// Component to handle map clicks
function LocationMarker() {
    const [position, setPosition] = useState<L.LatLng | null>(null);
    const [form, setForm] = useState<IncidentForm>({
        name: '',
        type: 'other',
        details: ''
    });
    const [submittedData, setSubmittedData] = useState<any>(null);

    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            setForm({ name: '', type: 'other', details: '' }); // Reset form
            setSubmittedData(null);

            // Shift map center "up" so the marker is lower, leaving room for popup
            const zoom = map.getZoom();
            const targetPoint = map.project(e.latlng, zoom);
            targetPoint.y -= 150; // Shift by 150 pixels upwards (negative Y is up)
            const targetLatLng = map.unproject(targetPoint, zoom);

            map.flyTo(targetLatLng, zoom);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!position) return;

        const data = {
            location: {
                lat: position.lat,
                lng: position.lng
            },
            ...form,
            timestamp: new Date().toISOString()
        };

        console.log('Incident Report JSON:', JSON.stringify(data, null, 2));
        setSubmittedData(data);
    };

    const markerRef = useRef<L.Marker>(null);

    useEffect(() => {
        if (position && markerRef.current) {
            markerRef.current.openPopup();
        }
    }, [position]);

    return (
        <>
            {/* Render Dummy Data Points */}
            {DUMMY_DATA.map((incident) => (
                <Marker
                    key={incident.id}
                    position={[incident.location.lat, incident.location.lng]}
                    icon={customIcon}
                >
                    <Popup minWidth={250}>
                        <div className="p-1 space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-3 h-3 rounded-full ${incident.type === 'robbery' || incident.type === 'assault'
                                    ? 'bg-red-500'
                                    : 'bg-yellow-500'
                                    }`} />
                                <h3 className="font-bold text-lg leading-none">{incident.name}</h3>
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{incident.type}</p>
                            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">{incident.details}</p>
                            <p className="text-[10px] text-gray-400 text-right">{new Date(incident.timestamp).toLocaleDateString()}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* Current "New Report" Marker */}
            {position && (
                <Marker position={position} icon={customIcon} ref={markerRef}>
                    <Popup minWidth={250}>
                        <div className="p-1">
                            {submittedData ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-3 h-3 rounded-full ${submittedData.type === 'robbery' || submittedData.type === 'assault'
                                            ? 'bg-red-500'
                                            : 'bg-yellow-500'
                                            }`} />
                                        <h3 className="font-bold text-lg leading-none">{submittedData.name}</h3>
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{submittedData.type}</p>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">{submittedData.details}</p>
                                    <button
                                        onClick={() => setSubmittedData(null)}
                                        className="text-xs text-forest hover:underline mt-2 w-full text-center"
                                    >
                                        Edit Report
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-3">
                                    <h3 className="font-semibold text-gray-900 border-b pb-2">Report Incident</h3>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600">Incident Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            placeholder="e.g., Bike Theft"
                                            className="w-full text-sm p-2 border rounded focus:outline-none focus:ring-2 focus:ring-forest/20"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600">Type</label>
                                        <select
                                            value={form.type}
                                            onChange={(e) => setForm({ ...form, type: e.target.value as IncidentType })}
                                            className="w-full text-sm p-2 border rounded focus:outline-none focus:ring-2 focus:ring-forest/20 bg-white"
                                        >
                                            <option value="other">Other</option>
                                            <option value="robbery">Robbery</option>
                                            <option value="assault">Assault</option>
                                            <option value="harassment">Harassment</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600">Details</label>
                                        <textarea
                                            required
                                            value={form.details}
                                            onChange={(e) => setForm({ ...form, details: e.target.value })}
                                            placeholder="Describe what happened..."
                                            className="w-full text-sm p-2 border rounded focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none"
                                            rows={3}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-2 px-3 bg-forest text-white rounded-md text-sm font-semibold hover:bg-forest-dark transition-colors shadow-sm"
                                    >
                                        Submit Report
                                    </button>
                                </form>
                            )}
                        </div>
                    </Popup>
                </Marker>
            )}
        </>
    );
}

export default function Map() {
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
                <LocationMarker />
            </MapContainer>
        </div>
    );
}
