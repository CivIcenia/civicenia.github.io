import { type APIContext } from "astro";
import { Astros } from "@helpers";
import { territories, markers, constDetails, defaultColor } from "@data/territories";

export async function GET(
    context: APIContext
) {
    const apiConstDetails = {
        ...constDetails,
        "website": context.url.origin,
    };

    const defaultDetails = Object.seal({
        "color": defaultColor
    });

    // Convert territories to GeoJSON-like format for borders.json
    const features = [
        ...territories.map(territory => ({
            ...defaultDetails,
            "name": territory.name === "Icenia" ? "Icenia" : `${territory.name} (Icenia)`,
            "id": territory.id,
            "color": territory.color,
            ...(territory.polygon ? { "polygon": territory.polygon } : {}),
            ...(territory.notes ? { "notes": territory.notes } : {}),
            ...(territory.links ? territory.links : {}),
            ...apiConstDetails
        })),
        ...markers.map(marker => ({
            ...defaultDetails,
            "name": marker.name,
            "id": marker.id,
            "color": marker.color,
            "x": marker.x,
            "z": marker.z,
            ...apiConstDetails
        }))
    ];

    return Astros.renderJson({
        "id": "civmc/icenia/territory",
        "name": "Icenian Territory",
        "info": {
            "version": "3.0.0-beta3",
            "last_update": Math.floor(Date.now() / 1000)
        },
        "features": features
    });
}
