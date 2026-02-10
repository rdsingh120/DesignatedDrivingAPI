// src/models/constants.js
export const USER_ROLES = Object.freeze({
  RIDER: "RIDER",
  DRIVER: "DRIVER",
  ADMIN: "ADMIN",
});

export const DRIVER_VERIFICATION_STATUS = Object.freeze({
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
});

export const DRIVER_AVAILABILITY = Object.freeze({
  OFFLINE: "OFFLINE",
  AVAILABLE: "AVAILABLE",
  BUSY: "BUSY",
});

export const TRIP_STATUS = Object.freeze({
  REQUESTED: "REQUESTED",
  ASSIGNED: "ASSIGNED",
  ENROUTE: "ENROUTE",
  DRIVING: "DRIVING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

export const PAYMENT_METHOD = Object.freeze({
  CASH: "CASH",
  MOCK: "MOCK",
});

export const PAYMENT_STATUS = Object.freeze({
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
});

export const INCIDENT_TYPE = Object.freeze({
  SAFETY: "SAFETY",
  VEHICLE_DAMAGE: "VEHICLE_DAMAGE",
  ROUTE_ISSUE: "ROUTE_ISSUE",
  PAYMENT_ISSUE: "PAYMENT_ISSUE",
  OTHER: "OTHER",
});

export const RATING_TARGET = Object.freeze({
  DRIVER: "DRIVER",
  RIDER: "RIDER",
});

export const GEO = Object.freeze({
  // MongoDB expects [longitude, latitude]
  POINT: "Point",
});
