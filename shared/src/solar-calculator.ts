/**
 * Solar Position Calculator
 * Based on Jean Meeus "Astronomical Algorithms"
 * Calculates sun position (elevation, azimuth) for any UTC datetime and location.
 */

export interface SolarPosition {
  /** Sun elevation in degrees (positive above horizon) */
  elevation: number;
  /** Sun azimuth in degrees, measured clockwise from North (N=0, E=90, S=180, W=270) */
  azimuth: number;
  /** Solar declination in degrees */
  declination: number;
  /** Hour angle in degrees */
  hourAngle: number;
}

function degToRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function radToDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

function sinDeg(deg: number): number {
  return Math.sin(degToRad(deg));
}

function cosDeg(deg: number): number {
  return Math.cos(degToRad(deg));
}

function tanDeg(deg: number): number {
  return Math.tan(degToRad(deg));
}

function normalizeAngle(deg: number): number {
  let result = deg % 360;
  if (result < 0) result += 360;
  return result;
}

/**
 * Calculate the Julian Day Number for a given UTC date
 */
function toJulianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;

  let yr = y;
  let mo = m;
  if (mo <= 2) {
    yr -= 1;
    mo += 12;
  }

  const A = Math.floor(yr / 100);
  const B = 2 - A + Math.floor(A / 4);

  return (
    Math.floor(365.25 * (yr + 4716)) +
    Math.floor(30.6001 * (mo + 1)) +
    d +
    B -
    1524.5
  );
}

/**
 * Calculate sun position for a given UTC date and geographic coordinates.
 * Implements the Jean Meeus algorithm from "Astronomical Algorithms".
 */
export function calculate(utcDate: Date, latitude: number, longitude: number): SolarPosition {
  const JD = toJulianDay(utcDate);
  // Julian Centuries since J2000.0
  const T = (JD - 2451545.0) / 36525.0;

  // Geometric Mean Longitude of the Sun (degrees)
  const L0 = normalizeAngle(280.46646 + T * (36000.76983 + 0.0003032 * T));

  // Mean Anomaly of the Sun (degrees)
  const M = normalizeAngle(357.52911 + T * (35999.05029 - 0.0001537 * T));

  // Eccentricity of Earth's orbit
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

  // Equation of Center (degrees)
  const C =
    (1.914602 - T * (0.004817 + 0.000014 * T)) * sinDeg(M) +
    (0.019993 - 0.000101 * T) * sinDeg(2 * M) +
    0.000289 * sinDeg(3 * M);

  // Sun's True Longitude (degrees)
  const sunTrueLong = L0 + C;

  // Sun's True Anomaly (degrees)
  // const v = M + C;

  // Apparent Longitude — corrected for nutation and aberration
  const omega = 125.04 - 1934.136 * T;
  const lambda = sunTrueLong - 0.00569 - 0.00478 * sinDeg(omega);

  // Mean Obliquity of the Ecliptic (degrees)
  const epsilon0 = 23.0 + (26.0 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60.0) / 60.0;

  // Corrected obliquity (with nutation)
  const epsilon = epsilon0 + 0.00256 * cosDeg(omega);

  // Right Ascension (in degrees)
  const alpha = radToDeg(
    Math.atan2(cosDeg(epsilon) * sinDeg(lambda), cosDeg(lambda))
  );

  // Declination (in degrees)
  const delta = radToDeg(Math.asin(sinDeg(epsilon) * sinDeg(lambda)));

  // Greenwich Mean Sidereal Time (in degrees)
  const GMST =
    280.46061837 +
    360.98564736629 * (JD - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;

  // Local Sidereal Time (in degrees)
  const LST = normalizeAngle(GMST + longitude);

  // Hour Angle (in degrees)
  let H = normalizeAngle(LST - alpha);
  if (H > 180) H -= 360;

  // Elevation (altitude) in degrees
  const sinElev =
    sinDeg(latitude) * sinDeg(delta) +
    cosDeg(latitude) * cosDeg(delta) * cosDeg(H);
  let elevation = radToDeg(Math.asin(sinElev));

  // Azimuth (from North, clockwise)
  const azimuthRad = Math.atan2(
    sinDeg(H),
    cosDeg(H) * sinDeg(latitude) - tanDeg(delta) * cosDeg(latitude)
  );
  let azimuth = normalizeAngle(radToDeg(azimuthRad) + 180);

  // Atmospheric refraction correction (Zimmerman's formula)
  if (elevation > -0.575) {
    let refractionArcMin: number;
    if (elevation > 85) {
      refractionArcMin = 0;
    } else if (elevation > 5) {
      refractionArcMin =
        58.1 / tanDeg(elevation) -
        0.07 / Math.pow(tanDeg(elevation), 3) +
        0.000086 / Math.pow(tanDeg(elevation), 5);
    } else if (elevation > -0.575) {
      refractionArcMin =
        1735 +
        elevation * (-518.2 + elevation * (103.4 + elevation * (-12.79 + elevation * 0.711)));
    } else {
      refractionArcMin = 0;
    }
    elevation += refractionArcMin / 60.0;
  }

  return {
    elevation,
    azimuth,
    declination: delta,
    hourAngle: H,
  };
}

export const SolarCalculator = { calculate };
export default SolarCalculator;
