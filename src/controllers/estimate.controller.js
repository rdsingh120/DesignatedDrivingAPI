// src/controllers/estimate.controller.js
import Estimate from "../models/Estimate.model.js";
import { getRouteOSRM } from "../services/osrm.service.js";
import { computeFare } from "../services/fare.service.js";
import { geocodeAddress, GeocodeError } from "../services/geocode.service.js";

function ttlMinutes() {
  const n = Number(process.env.ESTIMATE_TTL_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function isCoordObj(v) {
  return v && typeof v === "object" && typeof v.lat === "number" && typeof v.lng === "number";
}

export async function createEstimate(req, res) {
  try {
    const body = req.body || {};

    const pickup_address = typeof body.pickup_address === "string" ? body.pickup_address.trim() : "";
    const dropoff_address = typeof body.dropoff_address === "string" ? body.dropoff_address.trim() : "";

    let pickup = body.pickup;
    let dropoff = body.dropoff;

    let pickup_display = null;
    let dropoff_display = null;
    let geocode_provider = null;
    let geocode_base_url = null;

    const hasAddresses = !!pickup_address && !!dropoff_address;
    const hasCoords = isCoordObj(pickup) && isCoordObj(dropoff);

    if (!hasAddresses && !hasCoords) {
      return res.status(400).json({
        error: "Provide either (pickup_address + dropoff_address) OR (pickup{lat,lng} + dropoff{lat,lng}).",
      });
    }

    if (hasAddresses) {
      const [g1, g2] = await Promise.all([
        geocodeAddress(pickup_address),
        geocodeAddress(dropoff_address),
      ]);

      pickup = { lat: g1.lat, lng: g1.lng };
      dropoff = { lat: g2.lat, lng: g2.lng };

      pickup_display = g1.displayName;
      dropoff_display = g2.displayName;

      geocode_provider = g1.provider?.name || "Nominatim";
      geocode_base_url = g1.provider?.baseUrl || null;
    }

    const route = await getRouteOSRM({ pickup, dropoff });

    const distance_km = route.distance_m / 1000;
    const duration_minutes = route.duration_s / 60;

    const fare = computeFare({ distance_km, duration_min: duration_minutes });
    const expiresAt = new Date(Date.now() + ttlMinutes() * 60 * 1000);

    const doc = await Estimate.create({
      rider: req.user?.id || undefined,

      pickup_address: hasAddresses ? pickup_address : undefined,
      dropoff_address: hasAddresses ? dropoff_address : undefined,
      pickup_display_address: pickup_display || undefined,
      dropoff_display_address: dropoff_display || undefined,
      geocode_provider: geocode_provider || undefined,
      geocode_base_url: geocode_base_url || undefined,

      pickup_latitude: pickup.lat,
      pickup_longitude: pickup.lng,
      dropoff_latitude: dropoff.lat,
      dropoff_longitude: dropoff.lng,

      distance_km,
      duration_minutes,
      route_polyline: route.polyline,

      fare_total: fare.total,
      currency: fare.currency,
      pricing_version: fare.pricing_version,
      fare_breakdown: fare.breakdown,

      routing_provider: route.provider.name,
      routing_base_url: route.provider.baseUrl,

      expiresAt,
    });

    const eta_to_destination = new Date(Date.now() + route.duration_s * 1000);

    return res.status(201).json({
      estimateId: doc._id,

      pickup_address: doc.pickup_address || null,
      dropoff_address: doc.dropoff_address || null,
      pickup_display_address: doc.pickup_display_address || null,
      dropoff_display_address: doc.dropoff_display_address || null,

      pickup_geo: { lat: pickup.lat, lng: pickup.lng },
      dropoff_geo: { lat: dropoff.lat, lng: dropoff.lng },
      route_polyline: route.polyline || null,

      distance_km: round2(distance_km),
      duration_minutes: Math.round(duration_minutes),
      eta_to_destination,

      fare: {
        total: fare.total,
        currency: fare.currency,
        breakdown: fare.breakdown,
        pricing_version: fare.pricing_version,
      },

      expiresAt,
    });
  } catch (err) {
    if (err instanceof GeocodeError) {
      return res.status(err.status || 400).json({ error: err.message });
    }
    return res.status(502).json({ error: err?.message || "Estimate service unavailable" });
  }
}