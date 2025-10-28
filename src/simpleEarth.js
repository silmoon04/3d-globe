/**
 * Simple Earth Module
 * Fallback Earth renderer without complex shaders
 * 
 * This module provides a basic Earth visualization for systems that
 * cannot handle the full shader-based Earth. It uses standard Three.js
 * materials for maximum compatibility.
 * 
 * @module simpleEarth
 */

import * as THREE from "three";
import { CONFIG } from "./config.js";
import { TextureLoaderUtil } from "./utils/textureLoader.js";

/**
 * Create simple Earth mesh with basic material
 * 
 * This is a fallback version that doesn't use custom shaders.
 * It's used when the full shader-based Earth fails to load,
 * ensuring the application still works on older hardware.
 * 
 * @param {number} [radius=CONFIG.EARTH_RADIUS] - Earth radius in scene units
 * @param {number} [rotationSpeed=CONFIG.BASE_ROTATION_SPEED] - Rotation speed (radians/frame)
 * @returns {Promise<THREE.Mesh>} Simple Earth mesh
 * 
 * @example
 * const earth = await createSimpleEarthMesh(2.0, 0.001);
 * scene.add(earth);
 */
export async function createSimpleEarthMesh(
  radius = CONFIG.EARTH_RADIUS,
  rotationSpeed = CONFIG.BASE_ROTATION_SPEED
) {
  console.log('🌍 Creating simple Earth (fallback mode)...');

  const { width: segW, height: segH } = CONFIG.SPHERE_SEGMENTS;
  const geometry = new THREE.SphereGeometry(radius, segW, segH);

  // Try to load night texture, fallback to solid color
  let material;
  try {
    const nightTexture = await TextureLoaderUtil.load('./textures/earth_night.jpg');
    material = new THREE.MeshBasicMaterial({
      map: nightTexture,
      transparent: true,
      opacity: 1,
      alphaTest: 0.1,
      side: THREE.DoubleSide
    });
    console.log('✓ Night texture loaded');
  } catch (error) {
    console.warn('⚠ Night texture failed, using solid color:', error.message);

    // Fallback to basic dark blue material
    material = new THREE.MeshLambertMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    console.log('✓ Using solid color fallback');
  }

  const earthMesh = new THREE.Mesh(geometry, material);
  earthMesh.name = "earthSurfaceSimple";

  // Add rotation animation and overlay compatibility stubs
  earthMesh.userData = {
    rotationSpeed,

    /**
     * Stub methods for overlay system compatibility
     * Simple Earth doesn't support texture swapping, so these are no-ops
     */
    getTextures: () => ({}),
    replaceEarthMaterial: () => {
      console.warn('Simple Earth does not support material replacement');
    },
    restoreBaseMaterial: () => {
      console.warn('Simple Earth does not support material restoration');
    },

    // Reference to self for consistency
    earthMesh,

    /**
     * Update animation (called every frame)
     * @param {number} time - Current time (unused in simple mode)
     */
    update: (time) => {
      earthMesh.rotation.y += rotationSpeed;
    }
  };

  console.log('✓ Simple Earth created');
  return earthMesh;
}
