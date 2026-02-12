// src/services/fare.service.js
function numEnv(name, fallback) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

export function computeFare({ distance_km, duration_min }) {
  const base = numEnv("FARE_BASE", 5);
  const perKm = numEnv("FARE_PER_KM", 1.25);
  const perMin = numEnv("FARE_PER_MIN", 0.35);
  const minimum = numEnv("FARE_MINIMUM", 8);

  const subtotal = base + distance_km * perKm + duration_min * perMin;
  const total = Math.max(minimum, subtotal);

  return {
    currency: process.env.CURRENCY || "CAD",
    total: round2(total),
    breakdown: {
      base: round2(base),
      distance_component: round2(distance_km * perKm),
      time_component: round2(duration_min * perMin),
      minimum_applied: subtotal < minimum,
      minimum_fare: round2(minimum),
    },
    pricing_version: "v1", // bump this whenever you change formula/config strategy
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
