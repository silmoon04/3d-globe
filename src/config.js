/**
 * Global Configuration Module
 * 
 * Centralized configuration for the 3D Earth Globe application.
 * All tuneable parameters are defined here for easy customization.
 * 
 * Includes settings for:
 * - Geometry (sphere dimensions, segments)
 * - Animation (rotation speeds, multipliers)
 * - Camera (FOV, zoom limits, position)
 * - Lighting (intensities, colors, positions)
 * - Performance (star count, cache sizes)
 * - Rendering (quality presets)
 * 
 * @module config
 */

/**
 * Main configuration object containing all application settings
 * @const {Object} CONFIG
 */
export const CONFIG = {
  // ===== EARTH GEOMETRY =====
  EARTH_RADIUS: 2.0,
  EARTH_AXIAL_TILT_DEG: 23.5,
  
  // Sphere mesh quality (segments)
  SPHERE_SEGMENTS: {
    width: 64,
    height: 32
  },
  
  // ===== LAYER HEIGHTS =====
  // Heights are multipliers of Earth radius
  CLOUD_HEIGHT_MULTIPLIER: 1.05,      // 5% above surface
  ATMOSPHERE_HEIGHT_MULTIPLIER: 1.06,  // 6% above surface
  
  // ===== ROTATION SPEEDS =====
  BASE_ROTATION_SPEED: 0.001,          // Base Earth rotation (radians per frame)
  CLOUD_SPEED_MULTIPLIER: 1.5,         // Clouds rotate 1.5x faster than Earth
  ATMOSPHERE_SPEED_MULTIPLIER: 0.8,    // Atmosphere rotates slightly slower
  
  // ===== CAMERA SETTINGS =====
  CAMERA_FOV: 35,                      // Field of view in degrees
  CAMERA_NEAR: 1,                      // Near clipping plane
  CAMERA_FAR: 100,                     // Far clipping plane
  CAMERA_INITIAL_Z: 5,                 // Initial camera Z position
  
  // ===== ORBIT CONTROLS =====
  MIN_ZOOM: 3.5,                       // Minimum camera distance
  MAX_ZOOM: 10,                        // Maximum camera distance
  ENABLE_DAMPING: true,                // Smooth camera movement
  
  // ===== PERFORMANCE =====
  STAR_COUNT: 1000,                    // Number of background stars
  TIMELAPSE_CACHE_SIZE: 5,             // Number of frames to preload
  
  // Renderer settings
  RENDERER: {
    antialias: false,                  // Disabled for better performance
    powerPreference: "high-performance",
    precision: "mediump"
  },
  
  // ===== OVERLAY DEFAULTS =====
  DEFAULT_OVERLAY_BLEND: 0.8,          // Default overlay opacity (80%)
  DEFAULT_LENS_RADIUS: 0.12,           // Default lens reveal radius
  
  // ===== LIGHTING =====
  AMBIENT_LIGHT: {
    color: 0xffffff,
    intensity: 0.8
  },
  
  DIRECTIONAL_LIGHT: {
    color: 0xffffff,
    intensity: 1.2,
    position: { x: 5, y: 5, z: 5 }
  },
  
  FILL_LIGHT: {
    color: 0xffffff,
    intensity: 0.4,
    position: { x: -5, y: -3, z: -5 }
  },
  
  // ===== SCENE =====
  FOG: {
    color: 0x001122,
    density: 0.15
  },
  
  // ===== STARFIELD =====
  STARS: {
    count: 1000,
    minDistance: 25,
    maxDistance: 60,
    size: 0.2,
    affectedByFog: false
  }
};

/**
 * Helper function to get Earth radius with layer height
 * @param {string} layer - 'earth', 'cloud', or 'atmosphere'
 * @returns {number} Radius for the specified layer
 */
export function getLayerRadius(layer = 'earth') {
  const multipliers = {
    earth: 1.0,
    cloud: CONFIG.CLOUD_HEIGHT_MULTIPLIER,
    atmosphere: CONFIG.ATMOSPHERE_HEIGHT_MULTIPLIER
  };
  return CONFIG.EARTH_RADIUS * (multipliers[layer] || 1.0);
}

/**
 * Helper function to get rotation speed for a layer
 * @param {string} layer - 'earth', 'cloud', or 'atmosphere'
 * @returns {number} Rotation speed in radians per frame
 */
export function getRotationSpeed(layer = 'earth') {
  const multipliers = {
    earth: 1.0,
    cloud: CONFIG.CLOUD_SPEED_MULTIPLIER,
    atmosphere: CONFIG.ATMOSPHERE_SPEED_MULTIPLIER
  };
  return CONFIG.BASE_ROTATION_SPEED * (multipliers[layer] || 1.0);
}

