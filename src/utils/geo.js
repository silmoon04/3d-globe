/**
 * Geographic Utilities
 * Helper functions for coordinate system conversions
 * 
 * Handles conversions between:
 * - Latitude/Longitude (degrees)
 * - UV texture coordinates (0-1)
 * - 3D Cartesian vectors
 * 
 * Uses equirectangular (Plate Carrée) projection
 * 
 * @module geo
 */

import * as THREE from "three";

/**
 * Clamp value to [0, 1] range
 * @param {number} x - Value to clamp
 * @returns {number} Clamped value
 * @private
 */
const clamp01 = (x) => Math.max(0, Math.min(1, x));

/**
 * Wrap longitude to [-180, 180) range
 * 
 * @param {number} lon - Longitude in degrees
 * @returns {number} Wrapped longitude in degrees
 * 
 * @example
 * wrapLon(190)  // Returns -170
 * wrapLon(-190) // Returns 170
 */
export function wrapLon(lon) {
  let x = ((lon + 180) % 360 + 360) % 360 - 180;
  return x;
}

/**
 * Convert latitude/longitude to UV texture coordinates
 * 
 * Uses equirectangular projection:
 * - U (horizontal): longitude mapped to [0, 1]
 * - V (vertical): latitude mapped to [0, 1]
 * 
 * @param {number} latDeg - Latitude in degrees [-90, 90]
 * @param {number} lonDeg - Longitude in degrees [-180, 180]
 * @returns {{u: number, v: number}} UV coordinates [0, 1]
 * 
 * @example
 * // Equator at prime meridian
 * latLonToUV(0, 0)  // Returns { u: 0.5, v: 0.5 }
 * 
 * // North pole
 * latLonToUV(90, 0)  // Returns { u: 0.5, v: 1.0 }
 */
export function latLonToUV(latDeg, lonDeg) {
  const u = (wrapLon(lonDeg) + 180.0) / 360.0;
  const v = (latDeg + 90.0) / 180.0;
  return { u: clamp01(u), v: clamp01(v) };
}

/**
 * Convert UV texture coordinates to latitude/longitude
 * 
 * Inverse of latLonToUV using equirectangular projection
 * 
 * @param {number} u - U coordinate [0, 1]
 * @param {number} v - V coordinate [0, 1]
 * @returns {{lat: number, lon: number}} Latitude and longitude in degrees
 * 
 * @example
 * // Center of texture
 * uvToLatLon(0.5, 0.5)  // Returns { lat: 0, lon: 0 }
 * 
 * // Top-left corner
 * uvToLatLon(0, 1)  // Returns { lat: 90, lon: -180 }
 */
export function uvToLatLon(u, v) {
  const lon = u * 360.0 - 180.0;
  const lat = v * 180.0 - 90.0;
  return { lat, lon: wrapLon(lon) };
}

/**
 * Convert latitude/longitude to 3D Cartesian vector
 * 
 * Assumes Y-up coordinate system with sphere centered at origin.
 * 
 * @param {number} latDeg - Latitude in degrees [-90, 90]
 * @param {number} lonDeg - Longitude in degrees [-180, 180]
 * @param {number} [radius=1.0] - Sphere radius
 * @returns {THREE.Vector3} 3D position vector
 * 
 * @example
 * // Point on equator at prime meridian
 * const pos = latLonToVec3(0, 0, 2.0);
 * // Returns Vector3(2, 0, 0)
 * 
 * // North pole
 * const pole = latLonToVec3(90, 0, 2.0);
 * // Returns Vector3(0, 2, 0)
 */
export function latLonToVec3(latDeg, lonDeg, radius = 1.0) {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);

  const y = Math.sin(lat);
  const r = Math.cos(lat);
  const x = r * Math.cos(lon);
  const z = r * Math.sin(lon);

  return new THREE.Vector3(x, y, z).multiplyScalar(radius);
}

/**
 * Convert 3D Cartesian vector to latitude/longitude
 * 
 * Inverse of latLonToVec3. Assumes sphere centered at origin.
 * 
 * @param {THREE.Vector3} v - 3D position vector
 * @returns {{lat: number, lon: number}} Latitude and longitude in degrees
 * 
 * @example
 * const pos = new THREE.Vector3(2, 0, 0);
 * vec3ToLatLon(pos);  // Returns { lat: 0, lon: 0 }
 * 
 * @example
 * const pole = new THREE.Vector3(0, 2, 0);
 * vec3ToLatLon(pole);  // Returns { lat: 90, lon: 0 }
 */
export function vec3ToLatLon(v) {
  const r = v.length();
  const y = v.y / r;
  const lat = THREE.MathUtils.radToDeg(Math.asin(y));
  const lon = THREE.MathUtils.radToDeg(Math.atan2(v.z, v.x));

  return { lat, lon: wrapLon(lon) };
}
