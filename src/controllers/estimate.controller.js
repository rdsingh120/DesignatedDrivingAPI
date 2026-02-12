// src/controllers/estimate.controller.js
import Estimate from "../models/Estimate.model.js";
import { getRouteOSRM } from "../services/osrm.service.js";
import { computeFare } from "../services/fare.service.js";

function ttlMinutes() {
  const n = Number(process.env.ESTIMATE_TTL_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

export async function createEstimate(req, res) {
  // Expect body:
  // { pickup: {lat,lng}, dropoff: {lat,lng} }
  const { pickup, dropoff } = req.body || {};
  if (!pickup || !dropoff) {
    return res.status(400).json({ error: "pickup and dropoff are required" });
  }

  const route = await getRouteOSRM({ pickup, dropoff });

  const distance_km = route.distance_m / 1000;
  const duration_minutes = route.duration_s / 60;

  const fare = computeFare({ distance_km, duration_min: duration_minutes });

  const expiresAt = new Date(Date.now() + ttlMinutes() * 60 * 1000);

  const doc = await Estimate.create({
    rider: req.user?.id || undefined, // if you have auth middleware later
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

  // ETA to destination (trip time)
  const eta_to_destination = new Date(Date.now() + route.duration_s * 1000);

  return res.status(201).json({
    estimateId: doc._id,
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
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

