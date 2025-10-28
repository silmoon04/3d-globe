/**
 * Overlay Material Module
 * Creates custom shader material for blending NASA data overlays with Earth
 * 
 * Features:
 * - Day/night cycle integration
 * - Topographic displacement
 * - Smooth overlay blending
 * - Lens reveal effect for comparison
 * 
 * @module OverlayMaterial
 */

import * as THREE from "three";
import { OVERLAY_VERTEX_SHADER, OVERLAY_FRAGMENT_SHADER } from "../shaders/overlayShaders.js";

/**
 * Create overlay shader material
 * 
 * This material extends the base Earth rendering to support overlaying
 * scientific data from NASA satellites. It maintains the day/night cycle
 * and terrain effects while blending in the overlay data.
 * 
 * @param {Object} options - Material options
 * @param {THREE.Texture} options.dayTex - Day texture
 * @param {THREE.Texture} options.nightTex - Night texture with city lights
 * @param {THREE.Texture} options.topoTex - Topography texture for elevation
 * @returns {THREE.ShaderMaterial} Configured overlay material
 * 
 * @example
 * const material = createOverlayMaterial({
 *   dayTex: earthDayTexture,
 *   nightTex: earthNightTexture,
 *   topoTex: topographyTexture
 * });
 * 
 * // Later, update overlay
 * material.uniforms.overlayTex.value = nasaOverlayTexture;
 * material.uniforms.overlayMix.value = 0.8; // 80% blend
 */
export function createOverlayMaterial({ dayTex, nightTex, topoTex }) {
  // Create uniforms with default values
  const uniforms = {
    // Base Earth textures
    dayTexture: { value: dayTex },
    nightTexture: { value: nightTex },
    topographyTexture: { value: topoTex },

    // Overlay texture (starts empty)
    overlayTex: { value: new THREE.Texture() },

    // Overlay control parameters
    overlayMix: { value: 0.8 },  // Default 80% opacity

    // Lens reveal effect
    lensCenter: { value: new THREE.Vector2(-1, -1) },  // Off-screen initially
    lensRadius: { value: 0.12 },
    lensEnabled: { value: 0 },  // Disabled by default

    // Sun direction for day/night calculation
    sunDir: { value: new THREE.Vector3(-1, 0, 0).normalize() },

    // Animation time
    time: { value: 0.0 }
  };

  // Create shader material
  const material = new THREE.ShaderMaterial({
    name: "OverlayMaterial",
    uniforms,
    vertexShader: OVERLAY_VERTEX_SHADER,
    fragmentShader: OVERLAY_FRAGMENT_SHADER,
    transparent: false,
    side: THREE.DoubleSide
  });

  return material;
}
