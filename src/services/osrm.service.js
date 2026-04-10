// src/services/osrm.service.js
const DEFAULT_BASE = "https://router.project-osrm.org";

function assertNumber(n, name) {
  if (typeof n !== "number" || Number.isNaN(n)) {
    throw new Error(`${name} must be a number`);
  }
}

function validateCoords(lat, lng, label) {
  assertNumber(lat, `${label}.lat`);
  assertNumber(lng, `${label}.lng`);
  if (lat < -90 || lat > 90) throw new Error(`${label}.lat out of range`);
  if (lng < -180 || lng > 180) throw new Error(`${label}.lng out of range`);
}

export class RoutingError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "RoutingError";
    this.status = status;
  }
}

export async function getRouteOSRM({ pickup, dropoff }) {
  validateCoords(pickup.lat, pickup.lng, "pickup");
  validateCoords(dropoff.lat, dropoff.lng, "dropoff");

  const baseUrl = process.env.OSRM_BASE_URL || DEFAULT_BASE;

  // OSRM expects lon,lat
  const coords = `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`;

  const url =
    `${baseUrl}/route/v1/driving/${coords}` +
    `?overview=full&geometries=polyline&alternatives=false&steps=false`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  console.log("OSRM baseUrl:", baseUrl);
  console.log("OSRM coords:", coords);
  console.log("OSRM URL:", url);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new RoutingError(
        `OSRM request failed: ${res.status} ${res.statusText}`,
        res.status
      );
    }

    const data = await res.json();

    if (!data?.routes?.length) {
      throw new RoutingError("OSRM returned no routes", 502);
    }

    const r = data.routes[0];

    return {
      distance_m: r.distance,
      duration_s: r.duration,
      polyline: r.geometry || null,
      provider: {
        name: "OSRM",
        baseUrl,
      },
    };
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new RoutingError("Routing request timed out", 504);
    }

    if (err instanceof RoutingError) {
      throw err;
    }

    throw new RoutingError(err?.message || "Routing failed", 502);
  } finally {
    clearTimeout(timeout);
  }
}