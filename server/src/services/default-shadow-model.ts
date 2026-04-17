import { IShadowModel, OsmBuilding } from 'solar-res-shared';

/**
 * Simplified 2D shadow projection model (Projection2D-v1).
 * Estimates shadow fraction cast from a neighbor building onto a target building.
 */
export class DefaultShadowModel implements IShadowModel {
  readonly modelName = 'Projection2D-v1';

  calculateShadowFraction(
    target: OsmBuilding,
    neighbor: OsmBuilding,
    sunAzimuthDeg: number,
    sunElevationDeg: number
  ): number {
    // No shadow below horizon
    if (sunElevationDeg <= 0) return 0;

    // No shadow if neighbor is shorter than target
    const heightDiff = neighbor.heightMeters - target.heightMeters;
    if (heightDiff <= 0) return 0;

    // Distance between buildings (Haversine)
    const distance = haversineDistance(
      target.centroidLatitude, target.centroidLongitude,
      neighbor.centroidLatitude, neighbor.centroidLongitude
    );

    // Shadow length from height difference
    const sunElevRad = (sunElevationDeg * Math.PI) / 180;
    const shadowLength = heightDiff / Math.tan(sunElevRad);

    // If shadow doesn't reach (< 0.5× distance)
    if (shadowLength < distance * 0.5) return 0;

    // Check angular alignment
    const bearing = calculateBearing(
      target.centroidLatitude, target.centroidLongitude,
      neighbor.centroidLatitude, neighbor.centroidLongitude
    );

    // Shadow direction is opposite to sun
    const shadowDirection = (sunAzimuthDeg + 180) % 360;
    let angleDiff = Math.abs(bearing - shadowDirection);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;

    // If difference > 90° the shadow points away
    if (angleDiff > 90) return 0;

    // Calculate factors
    const angularFactor = Math.cos((angleDiff * Math.PI) / 180);
    const reachFactor = Math.min(1, shadowLength / distance);
    const sizeFactor = Math.min(1, Math.sqrt(neighbor.roofAreaSqm) / Math.max(1, Math.sqrt(target.roofAreaSqm)));

    const fraction = angularFactor * reachFactor * sizeFactor * 0.7;
    return Math.max(0, Math.min(0.9, fraction));
  }
}

/** Haversine distance in meters */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Bearing from point 1 to point 2 in degrees (0-360, clockwise from N) */
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export { haversineDistance, calculateBearing };
