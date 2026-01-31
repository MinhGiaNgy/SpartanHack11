import "dotenv/config";
import { prisma } from "../lib/prisma";
import { applyGeocoding } from "../lib/geocode";

async function main() {
    console.log("Starting geocoding process...");

    // 1. Fetch incidents missing coordinates
    // We only take the top 50 to avoid hitting rate limits too hard in one go, 
    // but you can run this multiple times.
    const limit = 50;
    const incidents = await prisma.crimeIncident.findMany({
        where: {
            OR: [
                { latitude: null },
                { longitude: null }
            ]
        },
        take: limit,
        orderBy: { occurredAt: 'desc' }
    });

    if (incidents.length === 0) {
        console.log("No incidents found that need geocoding.");
        return;
    }

    console.log(`Found ${incidents.length} incidents to geocode.`);

    // 2. Apply Geocoding
    // This uses the utility which handles the 1s delay for Nominatim
    const geocoded = await applyGeocoding(
        incidents as any[], // Cast to any to bypass strict type check for now since we know it has id/address
        (incident: any) => {
            // Construct address query
            const parts = [
                incident.locationName,
                incident.address,
                incident.location, // Fallback if address is empty
                "East Lansing, MI" // Context
            ].filter(Boolean);

            if (!parts.length) return null;
            // Remove duplicates and join
            return [...new Set(parts)].join(", ");
        },
        { max: limit, delayMs: 1100 }
    );

    // 3. Update Database
    // Filter out items that still don't have coords (failed geocoding)
    const updates = geocoded
        .filter(i => i.latitude != null && i.longitude != null)
        .map(incident =>
            prisma.crimeIncident.update({
                where: { id: incident.id },
                data: {
                    latitude: incident.latitude,
                    longitude: incident.longitude
                }
            })
        );

    if (updates.length > 0) {
        console.log(`Updating ${updates.length} records...`);
        await prisma.$transaction(updates);
        console.log("Successfully updated records.");
    } else {
        console.log("No coordinates resolved from addresses.");
    }
}

main()
    .catch((e) => {
        console.error("Error running script:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
