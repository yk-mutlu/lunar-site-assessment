import type { HorizonEphemeris } from "@/types";

/**
 * Calculates high-fidelity lunar ephemeris: Sun & Earth elevation and azimuth
 * relative to the local landing site horizon, accounting for lunar obliquity (1.54°),
 * synodic rotation (708.7 hrs/cycle), tidal locking, and libration wobbles.
 */
export function computeHorizonEphemeris(
  lat: number,
  lng: number,
  elevationM: number,
  lunarHour: number // 0 to 708 hours
): HorizonEphemeris {
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  const latRad = lat * DEG2RAD;
  const lngRad = lng * DEG2RAD;

  // 1. Solar Motion over 708.7 hr Synodic Month
  const synodicPeriod = 708.73; // hours
  const solarFraction = (lunarHour % synodicPeriod) / synodicPeriod;
  const subSolarLngDeg = (180 - solarFraction * 360 + 360) % 360; // moves westwards

  // Moon's obliquity to ecliptic is 1.54° + seasonal tilt variation
  const lunarSeasonPhase = (lunarHour / (365.25 * 24)) * 2 * Math.PI;
  const subSolarLatDeg = 1.54 * Math.sin(lunarSeasonPhase);

  // Local Hour Angle of the Sun
  const sunHAdiff = ((lng - subSolarLngDeg + 540) % 360) - 180;
  const sunHARad = sunHAdiff * DEG2RAD;
  const subSolarLatRad = subSolarLatDeg * DEG2RAD;

  // Spherical Trig for Sun Elevation (Altitude)
  // sin(h) = sin(lat)*sin(dec) + cos(lat)*cos(dec)*cos(HA)
  const sinSunElev =
    Math.sin(latRad) * Math.sin(subSolarLatRad) +
    Math.cos(latRad) * Math.cos(subSolarLatRad) * Math.cos(sunHARad);
  let sunElevationDeg = Math.asin(Math.max(-1, Math.min(1, sinSunElev))) * RAD2DEG;

  // Horizon dip adjustment due to terrain elevation: dip = sqrt(2 * h / R)
  // Higher summits see the Sun slightly longer!
  const horizonDipDeg = Math.sqrt((2 * Math.max(0, elevationM + 3000)) / 1737400) * RAD2DEG;
  sunElevationDeg += horizonDipDeg;

  // Sun Azimuth
  const cosSunAz =
    (Math.sin(subSolarLatRad) - Math.sin(latRad) * Math.sin(sunElevationDeg * DEG2RAD)) /
    (Math.cos(latRad) * Math.cos(sunElevationDeg * DEG2RAD) + 1e-6);
  let sunAzimuthDeg = Math.acos(Math.max(-1, Math.min(1, cosSunAz))) * RAD2DEG;
  if (Math.sin(sunHARad) > 0) {
    sunAzimuthDeg = 360 - sunAzimuthDeg;
  }

  // 2. Earth Position (Tidally locked with ~6.5° optical libration)
  // Libration cycles: longitudinal ~27.55 days (anomalistic), latitudinal ~27.21 days (nodical)
  const librationLng = 6.5 * Math.sin((lunarHour / 661.3) * 2 * Math.PI);
  const librationLat = 6.7 * Math.cos((lunarHour / 653.0) * 2 * Math.PI);

  const subEarthLatDeg = librationLat;
  const subEarthLngDeg = librationLng;

  const subEarthLatRad = subEarthLatDeg * DEG2RAD;
  const earthHAdiff = ((lng - subEarthLngDeg + 540) % 360) - 180;
  const earthHARad = earthHAdiff * DEG2RAD;

  const sinEarthElev =
    Math.sin(latRad) * Math.sin(subEarthLatRad) +
    Math.cos(latRad) * Math.cos(subEarthLatRad) * Math.cos(earthHARad);
  let earthElevationDeg = Math.asin(Math.max(-1, Math.min(1, sinEarthElev))) * RAD2DEG;
  earthElevationDeg += horizonDipDeg * 0.7;

  // Earth Azimuth
  const cosEarthAz =
    (Math.sin(subEarthLatRad) - Math.sin(latRad) * Math.sin(earthElevationDeg * DEG2RAD)) /
    (Math.cos(latRad) * Math.cos(earthElevationDeg * DEG2RAD) + 1e-6);
  let earthAzimuthDeg = Math.acos(Math.max(-1, Math.min(1, cosEarthAz))) * RAD2DEG;
  if (Math.sin(earthHARad) > 0) {
    earthAzimuthDeg = 360 - earthAzimuthDeg;
  }

  // 3. Operational Windows: Time to Sunset & Earthset
  const isSunVisible = sunElevationDeg > 0;
  const isEarthVisible = earthElevationDeg > 1.5; // Direct LOS threshold

  // Rate of Sun elevation change: approx ~0.5°/hr at equator, varies at poles
  const sunSpeedPerHour = Math.max(0.015, Math.abs(Math.cos(latRad) * 0.508));
  let timeToSunsetHours = 0;
  if (isSunVisible) {
    timeToSunsetHours = Math.round(sunElevationDeg / sunSpeedPerHour);
    // Polar peaks can have prolonged light up to 150+ hours
    if (Math.abs(lat) > 85) timeToSunsetHours = Math.min(240, timeToSunsetHours + 80);
  }

  // Earthset time (depends on libration period ~660 hrs)
  let timeToEarthsetHours = 0;
  if (isEarthVisible) {
    if (earthElevationDeg > 15) {
      timeToEarthsetHours = 999; // Continuous permanent LOS (never sets!)
    } else {
      timeToEarthsetHours = Math.round(Math.max(12, earthElevationDeg * 25));
    }
  }

  // Solar Irradiance and Power Potential Modeling (NASA Solar Constant = 1361 W/m2)
  const solarConstant = 1361.0; // W/m2 at 1 AU
  const cellEfficiency = 0.28; // GaInP/GaAs 28% space-grade multi-junction cell
  const standardArrayAreaM2 = 2.0; // Standard 2m2 robotic rover/lander deployable array

  let solarPowerPotentialPct = 0;
  let verticalWatts = 0;
  let horizontalWatts = 0;
  let trackingWatts = 0;
  let actualIrradiance = 0;

  if (isSunVisible) {
    actualIrradiance = solarConstant;
    const sinElev = Math.sin(Math.max(0, sunElevationDeg) * DEG2RAD);
    const cosElev = Math.cos(Math.max(0, sunElevationDeg) * DEG2RAD);

    // Tracking array gets normal incidence (1.0)
    trackingWatts = Math.round(solarConstant * cellEfficiency * standardArrayAreaM2);
    // Vertical array efficiency proportional to cos(elevation)
    verticalWatts = Math.round(solarConstant * cosElev * cellEfficiency * standardArrayAreaM2 * 0.9);
    // Horizontal array efficiency proportional to sin(elevation)
    horizontalWatts = Math.round(solarConstant * sinElev * cellEfficiency * standardArrayAreaM2);

    if (Math.abs(lat) > 75) {
      // Polar vertical array captures low grazing sunlight best
      solarPowerPotentialPct = Math.min(100, Math.round(80 + Math.min(20, sunElevationDeg * 6)));
    } else {
      // Equatorial horizontal array captures overhead sun best
      solarPowerPotentialPct = Math.min(100, Math.round(sinElev * 100));
    }
  }

  // Deep Space Network RF Link Margin Modeling (X-band / Ka-band)
  // Horizon geometric visibility does NOT automatically guarantee link closure:
  // Requires >= 3.0° elevation clearance above local topographic obstacles
  const isGeometricLOS = earthElevationDeg > 0;
  const isCommsViable = earthElevationDeg > 3.0;
  const rfLinkMarginDb = isCommsViable
    ? Number((Math.min(14.5, 3.5 + earthElevationDeg * 0.35)).toFixed(1))
    : Number((-10.0 + Math.max(-15, earthElevationDeg * 1.5)).toFixed(1));

  return {
    sunElevationDeg: Number(sunElevationDeg.toFixed(2)),
    sunAzimuthDeg: Number(sunAzimuthDeg.toFixed(1)),
    earthElevationDeg: Number(earthElevationDeg.toFixed(2)),
    earthAzimuthDeg: Number(earthAzimuthDeg.toFixed(1)),
    timeToSunsetHours,
    timeToEarthsetHours,
    isSunVisible,
    isEarthVisible,
    solarPowerPotentialPct: Math.max(0, solarPowerPotentialPct),
    solarIrradianceWm2: actualIrradiance,
    panelOrientationWatts: {
      vertical: verticalWatts,
      horizontal: horizontalWatts,
      tracking: trackingWatts,
    },
    rfLinkMarginDb,
    isGeometricLOS,
    isCommsViable,
  };
}
