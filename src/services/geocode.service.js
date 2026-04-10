const DEFAULT_BASE = "https://nominatim.openstreetmap.org";

function normalizeStr(s) {
  return typeof s === "string" ? s.trim() : "";
}

// Build a short human-readable address from Nominatim's structured address object.
// e.g. "100 King Street West, Toronto, ON" instead of the full verbose display_name.
function buildShortAddress(address, fallback) {
  if (!address) return fallback;
  const parts = [];
  const street = [address.house_number, address.road].filter(Boolean).join(" ");
  if (street) parts.push(street);
  const city = address.city || address.town || address.village || address.municipality;
  if (city) parts.push(city);
  // ISO3166-2-lvl4 gives "CA-ON" — extract the province/state code after the dash
  const province = address["ISO3166-2-lvl4"]?.split("-")[1] || address.state;
  if (province) parts.push(province);
  return parts.length ? parts.join(", ") : fallback;
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
  const timeout = setTimeout(() => controller.abort(), 15000);

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
  throw new GeocodeError(`Geocoding failed (${res.status})`, res.status);
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
      displayName: buildShortAddress(first.address, first.display_name || q),
      raw: first,
      provider: { name: "Nominatim", baseUrl },
    };
  } catch (err) {
  if (err?.name === "AbortError") {
    throw new GeocodeError("Geocoding request timed out", 504);
  }

  if (err instanceof GeocodeError) {
    throw err;
  }

  throw new GeocodeError(err?.message || "Geocoding failed", 502);
} 
  finally {
    clearTimeout(timeout);
  }
}