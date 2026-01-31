import { prisma } from "../../../lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const incidents = await prisma.crimeIncident.findMany({
            where: {
                // Only return incidents that have coordinates
                latitude: { not: null },
                longitude: { not: null }
            },
            orderBy: {
                occurredAt: 'desc'
            },
            take: 100 // Limit for safety
        });

        // Map to the format the frontend expects
        const mappedIncidents = incidents.map(incident => ({
            id: incident.id, // Keep string ID if possible, or we might need to cast if frontend expects number
            name: incident.offenseCode || `Incident ${incident.incidentNum}` || 'Reported Incident',
            type: determineType(incident.description),
            details: incident.description,
            // image: incident.imageUrl || null, // If we ever add images back
            location: {
                lat: incident.latitude!,
                lng: incident.longitude!
            },
            timestamp: incident.occurredAt?.toISOString() || incident.createdAt.toISOString()
        }));

        return Response.json(mappedIncidents);
    } catch (error) {
        console.error("Failed to fetch incidents:", error);
        return Response.json({ error: "Failed to fetch incidents" }, { status: 500 });
    }
}

// ... helpers
function determineType(text: string): 'robbery' | 'assault' | 'harassment' | 'other' {
    const lower = text.toLowerCase();
    if (lower.includes('robbery') || lower.includes('theft') || lower.includes('stolen') || lower.includes('larceny')) return 'robbery';
    if (lower.includes('assault') || lower.includes('battery') || lower.includes('fight')) return 'assault';
    if (lower.includes('harassment') || lower.includes('stalking') || lower.includes('threat')) return 'harassment';
    return 'other';
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, type, details, image, location } = body;

        // Validation
        if (!location || !location.lat || !location.lng) {
            return Response.json({ error: "Location is required" }, { status: 400 });
        }

        const newIncident = await prisma.crimeIncident.create({
            data: {
                source: "user_report",
                sourceIncidentId: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                description: details || "No details provided",
                offenseCode: name || "User Report",
                // Map frontend 'type' to database fields if needed, or store in raw
                location: `${location.lat}, ${location.lng}`,
                latitude: location.lat,
                longitude: location.lng,
                agency: "User Submitted",
                occurredAt: new Date(),
                // Store extra fields (like image base64) in the JSON 'raw' field since schema is fixed
                raw: {
                    user_submitted: true,
                    type,
                    image_data: image // Store base64 image here
                }
            }
        });

        // Return the formatted object expected by frontend
        return Response.json({
            id: newIncident.id,
            name: newIncident.offenseCode,
            type: determineType(newIncident.description + " " + (newIncident.offenseCode || "")), // simplistic, or we read from raw
            details: newIncident.description,
            location: {
                lat: newIncident.latitude,
                lng: newIncident.longitude
            },
            timestamp: newIncident.occurredAt?.toISOString()
        });

    } catch (error) {
        console.error("Failed to submit incident:", error);
        return Response.json({ error: "Failed to submit incident" }, { status: 500 });
    }
}
