/**
 * Starfield Generator
 * Creates procedural starfield background for 3D space scenes
 * 
 * @module getStarfield
 */

import * as THREE from "three";

/**
 * Generate a starfield with random star positions and colors
 * 
 * Creates a spherical distribution of point lights representing stars.
 * Stars are positioned randomly on a sphere surface at varying distances,
 * with random hues for subtle color variation.
 * 
 * @param {Object} [options={}] - Configuration options
 * @param {number} [options.numStars=500] - Number of stars to generate
 * @param {boolean} [options.fog=true] - Whether stars are affected by scene fog
 * @returns {THREE.Points} Points object containing the starfield
 * 
 * @example
 * // Create 1000 stars unaffected by fog
 * const stars = getStarfield({ numStars: 1000, fog: false });
 * scene.add(stars);
 * 
 * @example
 * // Create default starfield (500 stars with fog)
 * const stars = getStarfield();
 * scene.add(stars);
 */
export default function getStarfield({ numStars = 500, fog = true } = {}) {
  const positions = [];
  const colors = [];

  // Generate random star positions and colors
  for (let i = 0; i < numStars; i++) {
    // Random distance from center (creates depth)
    const radius = Math.random() * 35 + 25;

    // Uniform distribution on sphere surface
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;           // Azimuthal angle
    const phi = Math.acos(2 * v - 1);        // Polar angle

    // Convert spherical to Cartesian coordinates
    positions.push(
      radius * Math.sin(phi) * Math.cos(theta),  // x
      radius * Math.sin(phi) * Math.sin(theta),  // y
      radius * Math.cos(phi)                     // z
    );

    // Random color with low saturation for realistic stars
    const color = new THREE.Color().setHSL(
      Math.random(),  // Random hue
      0.1,           // Low saturation (mostly white)
      Math.random()   // Random luminance
    );
    colors.push(color.r, color.g, color.b);
  }

  // Create geometry and set attributes
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  // Create point material
  const material = new THREE.PointsMaterial({
    size: 0.2,
    vertexColors: true,
    fog
  });

  return new THREE.Points(geometry, material);
}
