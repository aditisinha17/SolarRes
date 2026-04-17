import axios from 'axios';
import { IOsmBuildingService, OsmBuilding } from 'solar-res-shared';

/**
 * Fetches building footprints from OpenStreetMap via Overpass API.
 * Extracts heights, levels, roof areas (Shoelace formula), and centroids.
 */
export class OsmBuildingService implements IOsmBuildingService {
  private overpassUrl = 'https://overpass-api.de/api/interpreter';

  async getBuildingsInRadiusAsync(lat: number, lng: number, radiusMeters: number): Promise<OsmBuilding[]> {
    const query = `[out:json][timeout:30];way["building"](around:${radiusMeters},${lat},${lng});out body geom;`;

    try {
      const response = await axios.post(this.overpassUrl, `data=${encodeURIComponent(query)}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 35000,
      });

      const elements = response.data?.elements;
      if (!Array.isArray(elements)) return [];

      const buildings: OsmBuilding[] = [];

      for (const el of elements) {
        if (!el.geometry || el.geometry.length < 3) continue;

        const nodes: { lat: number; lon: number }[] = el.geometry;

        // Compute centroid
        let sumLat = 0, sumLon = 0;
        for (const n of nodes) {
          sumLat += n.lat;
          sumLon += n.lon;
        }
        const centroidLat = sumLat / nodes.length;
        const centroidLon = sumLon / nodes.length;

        // Extract height
        const tags = el.tags || {};
        let heightMeters = 9; // default 3 floors
        if (tags.height) {
          const parsed = parseFloat(tags.height);
          if (!isNaN(parsed)) heightMeters = parsed;
        } else if (tags['building:levels']) {
          const levels = parseInt(tags['building:levels'], 10);
          if (!isNaN(levels)) heightMeters = levels * 3;
        }

        const levels = Math.max(1, Math.round(heightMeters / 3));

        // Compute roof area via Shoelace formula (approximated in meters)
        const roofArea = this.computeAreaShoelace(nodes);

        // Build footprint as [lat, lng] pairs
        const footprint = nodes.map(n => [n.lat, n.lon]);

        buildings.push({
          id: el.id,
          centroidLatitude: centroidLat,
          centroidLongitude: centroidLon,
          heightMeters,
          levels,
          roofAreaSqm: Math.round(roofArea * 100) / 100,
          footprint,
          name: tags.name || undefined,
          buildingType: tags.building || undefined,
        });
      }

      return buildings;
    } catch (error) {
      console.warn('Overpass API failed:', (error as Error).message);
      return [];
    }
  }

  /**
   * Compute polygon area using the Shoelace formula.
   * Converts lat/lng to approximate meters using local tangent plane.
   */
  private computeAreaShoelace(nodes: { lat: number; lon: number }[]): number {
    if (nodes.length < 3) return 0;

    // Reference point for local coordinate conversion
    const refLat = nodes[0].lat;
    const refLon = nodes[0].lon;
    const cosRef = Math.cos((refLat * Math.PI) / 180);
    const metersPerDegLat = 111320;
    const metersPerDegLon = 111320 * cosRef;

    // Convert to meters relative to reference
    const coords = nodes.map(n => ({
      x: (n.lon - refLon) * metersPerDegLon,
      y: (n.lat - refLat) * metersPerDegLat,
    }));

    // Shoelace formula
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      area += coords[i].x * coords[j].y;
      area -= coords[j].x * coords[i].y;
    }

    return Math.abs(area) / 2;
  }
}
