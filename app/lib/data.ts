export type IncidentType = 'robbery' | 'assault' | 'harassment' | 'traffic' | 'other';

export interface IncidentForm {
    name: string;
    type: IncidentType;
    details: string;
    image?: string; // Base64 string
}

export type Incident = IncidentForm & {
    id: string | number; // Support both DB (string) and Dummy (number)
    location: { lat: number; lng: number };
    timestamp: string;
};

export const DUMMY_DATA: Incident[] = [
    {
        id: 1,
        name: 'Bike Stolen',
        type: 'robbery',
        details: 'My Trek bike was cut from the lock outside the library.',
        image: 'https://images.unsplash.com/photo-1533230332214-7d43236eb388?q=80&w=300&auto=format&fit=crop', // Example image
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
    },
    // Cluster near Library (High Severity, Concentrated Time - DANGER ZONE)
    // Dates: Oct 25, 26, 27, 26, 25 (All within ~3 days)
    {
        id: 4,
        name: 'Phone Snatch',
        type: 'robbery',
        details: 'Phone snatched from hand while walking.',
        location: { lat: 42.7292, lng: -84.4812 },
        timestamp: '2023-10-26T12:00:00Z'
    },
    {
        id: 5,
        name: 'Vandalism',
        type: 'other',
        details: 'Graffiti on the library wall.',
        location: { lat: 42.7288, lng: -84.4808 },
        timestamp: '2023-10-25T09:00:00Z'
    },
    {
        id: 6,
        name: 'Bike Parts Stolen',
        type: 'robbery',
        details: 'Wheel missing from bike.',
        location: { lat: 42.7291, lng: -84.4815 },
        timestamp: '2023-10-26T10:00:00Z'
    },
    // Cluster near Stadium (Low Severity, Spread out Time - NO DANGER ZONE)
    // Dates: Oct 1, Oct 10, Oct 20, Oct 30 (Spread over month)
    {
        id: 7,
        name: 'Noise Complaint',
        type: 'other',
        details: 'Loud music from tailgaters.',
        location: { lat: 42.7240, lng: -84.4750 },
        timestamp: '2023-10-01T15:00:00Z'
    },
    {
        id: 8,
        name: 'Littering',
        type: 'other',
        details: 'Trash left all over the parking lot.',
        location: { lat: 42.7242, lng: -84.4752 },
        timestamp: '2023-10-10T08:00:00Z'
    },
    {
        id: 10,
        name: 'Loitering',
        type: 'other',
        details: 'People hanging out after hours.',
        location: { lat: 42.7245, lng: -84.4748 },
        timestamp: '2023-10-20T22:00:00Z'
    },
    {
        id: 11,
        name: 'Minor Argument',
        type: 'harassment',
        details: 'Verbal dispute in parking lot.',
        location: { lat: 42.7238, lng: -84.4755 },
        timestamp: '2023-10-30T14:00:00Z'
    },
    // Isolated
    {
        id: 9,
        name: 'Suspicious Activity',
        type: 'other',
        details: 'Person looking into car windows.',
        location: { lat: 42.7350, lng: -84.4900 }, // Far away
        timestamp: '2023-10-30T22:00:00Z'
    }
];
