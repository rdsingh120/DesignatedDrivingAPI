const DEFAULT_BASE = "https://nominatim.openstreetmap.org";

function normalizeStr(s) {
  return typeof s === "string" ? s.trim() : "";
}

export class GeocodeError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "GeocodeError";
    this.status = status;
  }
}

export async function geocodeAddress(addressString) {
  const q = normalizeStr(addressString);
  if (!q) throw new GeocodeError("Address is required", 400);

  const baseUrl = process.env.GEOCODE_BASE_URL || DEFAULT_BASE;

  const url =
    `${baseUrl}/search` +
    `?q=${encodeURIComponent(q)}` +
    `&format=jsonv2&limit=1&addressdetails=1`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Nominatim requires an identifying User-Agent. Put your app name + contact.
        "User-Agent": process.env.GEOCODE_USER_AGENT || "DesignatedDrivingAPI/1.0 (contact: admin@example.com)",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      throw new GeocodeError(`Geocoding failed (${res.status})`, 502);
    }

    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;

    if (!first?.lat || !first?.lon) {
      throw new GeocodeError("Address not found", 400);
    }

    const lat = Number(first.lat);
    const lng = Number(first.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new GeocodeError("Geocoding returned invalid coordinates", 502);
    }

    return {
      lat,
      lng,
      displayName: first.display_name || q,
      raw: first,
      provider: { name: "Nominatim", baseUrl },
    };
  } finally {
    clearTimeout(timeout);
  }
}