/**
 * Separate Cloud Layer Earth Module
 * 
 * Creates a realistic Earth with:
 * - Day/night dynamic lighting with city lights
 * - Independent cloud layer rotation
 * - Topographic terrain elevation
 * - Atmospheric glow effect
 * - Scientific 23.5° axial tilt
 * 
 * @module separateCloudEarth
 */

import * as THREE from "three";
import { CONFIG, getLayerRadius } from "./config.js";
import { TextureLoaderUtil } from "./utils/textureLoader.js";
import {
  EARTH_VERTEX_SHADER,
  EARTH_FRAGMENT_SHADER,
  CLOUD_VERTEX_SHADER,
  CLOUD_FRAGMENT_SHADER,
  ATMOSPHERE_VERTEX_SHADER,
  ATMOSPHERE_FRAGMENT_SHADER
} from "./shaders/earthShaders.js";

// ===== CONSTANTS =====
const LAYER_NAMES = {
  earth: "earthSurface",
  clouds: "earthClouds",
  atmosphere: "earthAtmosphere"
};

const TEXTURE_PATHS = {
  day: './textures/earth.jpg',
  night: './textures/earth_night_lights.jpg',
  clouds: [
    './textures/earth_clouds.jpg',
    './textures/earth_clouds.png',
    './textures/earth_clouds.tif'
  ],
  topography: './textures/topography_earth.jpg'
};

// ===== TEXTURE LOADING =====

/**
 * Load all required textures for Earth rendering
 * @returns {Promise<Object>} Object containing all loaded textures
 * @throws {Error} If any required texture fails to load
 */
async function loadAllTextures() {
  try {
    const [day, night, clouds, topography] = await Promise.all([
      TextureLoaderUtil.load(TEXTURE_PATHS.day),
      TextureLoaderUtil.load(TEXTURE_PATHS.night),
      TextureLoaderUtil.load(TEXTURE_PATHS.clouds),
      TextureLoaderUtil.load(TEXTURE_PATHS.topography, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter
      })
    ]);

    return { day, night, clouds, topography };
  } catch (error) {
    console.error('❌ Failed to load Earth textures:', error);
    throw new Error('Required Earth textures missing');
  }
}

// ===== GEOMETRY CREATION =====

/**
 * Create sphere geometries for all Earth layers
 * @param {number} baseRadius - Base Earth radius
 * @returns {Object} Object containing geometries for each layer
 */
function createLayerGeometries(baseRadius) {
  const { width: segW, height: segH } = CONFIG.SPHERE_SEGMENTS;
  const radiusScale = baseRadius / CONFIG.EARTH_RADIUS;

  return {
    earth: new THREE.SphereGeometry(baseRadius, segW, segH),
    cloud: new THREE.SphereGeometry(
      getLayerRadius('cloud') * radiusScale, 
      segW, 
      segH
    ),
    atmosphere: new THREE.SphereGeometry(
      getLayerRadius('atmosphere') * radiusScale, 
      segW, 
      segH
    )
  };
}

// ===== MATERIAL CREATION =====

/**
 * Create shader material for Earth surface
 * @param {Object} textures - Loaded texture objects
 * @returns {THREE.ShaderMaterial} Earth surface material
 */
function createEarthMaterial(textures) {
  return new THREE.ShaderMaterial({
    name: "BaseEarthMaterial",
    uniforms: {
      dayTexture: { value: textures.day },
      nightTexture: { value: textures.night },
      topographyTexture: { value: textures.topography },
      time: { value: 0.0 }
    },
    vertexShader: EARTH_VERTEX_SHADER,
    fragmentShader: EARTH_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    transparent: false
  });
}

/**
 * Create shader material for cloud layer
 * @param {THREE.Texture} cloudsTexture - Cloud texture
 * @returns {THREE.ShaderMaterial} Cloud layer material
 */
function createCloudMaterial(cloudsTexture) {
  return new THREE.ShaderMaterial({
    name: "CloudMaterial",
    uniforms: {
      cloudsTexture: { value: cloudsTexture },
      time: { value: 0.0 }
    },
    vertexShader: CLOUD_VERTEX_SHADER,
    fragmentShader: CLOUD_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
}

/**
 * Create shader material for atmosphere glow
 * @returns {THREE.ShaderMaterial} Atmosphere material
 */
function createAtmosphereMaterial() {
  return new THREE.ShaderMaterial({
    name: "AtmosphereMaterial",
    uniforms: {
      time: { value: 0.0 }
    },
    vertexShader: ATMOSPHERE_VERTEX_SHADER,
    fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
}

// ===== MESH CREATION =====

/**
 * Create meshes for all Earth layers
 * @param {Object} geometries - Layer geometries
 * @param {Object} materials - Layer materials
 * @returns {Object} Object containing all meshes
 */
function createLayerMeshes(geometries, materials) {
  const earthMesh = new THREE.Mesh(geometries.earth, materials.earth);
  earthMesh.name = LAYER_NAMES.earth;

  const cloudMesh = new THREE.Mesh(geometries.cloud, materials.cloud);
  cloudMesh.name = LAYER_NAMES.clouds;

  const atmosphereMesh = new THREE.Mesh(geometries.atmosphere, materials.atmosphere);
  atmosphereMesh.name = LAYER_NAMES.atmosphere;

  // Apply Earth's axial tilt (23.5° for scientific accuracy)
  const tilt = CONFIG.EARTH_AXIAL_TILT_DEG * Math.PI / 180;
  earthMesh.rotation.x = tilt;
  cloudMesh.rotation.x = tilt;
  atmosphereMesh.rotation.x = tilt;

  return { earthMesh, cloudMesh, atmosphereMesh };
}

// ===== GROUP CREATION =====

/**
 * Create Earth group with all layers and animation logic
 * @param {Object} meshes - Layer meshes
 * @param {Object} materials - Layer materials
 * @param {number} rotationSpeed - Base rotation speed
 * @param {Object} textures - Loaded textures (for overlay system)
 * @returns {THREE.Group} Complete Earth group
 */
function createEarthGroup(meshes, materials, rotationSpeed, textures) {
  const { earthMesh, cloudMesh, atmosphereMesh } = meshes;
  const { earth: earthMaterial, cloud: cloudMaterial, atmosphere: atmosphereMaterial } = materials;

  const earthGroup = new THREE.Group();
  earthGroup.add(earthMesh);
  earthGroup.add(cloudMesh);
  earthGroup.add(atmosphereMesh);
  
  // Attach user data for animation and overlay system
  earthGroup.userData = {
    // Rotation speeds
    earthRotationSpeed: rotationSpeed,
    cloudRotationSpeed: rotationSpeed * CONFIG.CLOUD_SPEED_MULTIPLIER,
    atmosphereRotationSpeed: rotationSpeed * CONFIG.ATMOSPHERE_SPEED_MULTIPLIER,

    // Materials (for overlay system)
    earthMaterial,
    cloudMaterial,
    atmosphereMaterial,

    // Mesh reference
    earthMesh,

    /**
     * Get textures for overlay system
     * @returns {Object} Texture references
     */
    getTextures: () => ({
      dayTexture: textures.day,
      nightTexture: textures.night,
      topographyTexture: textures.topography
    }),

    /**
     * Replace Earth material (used by overlay system)
     * @param {THREE.Material} newMaterial - New material to apply
     */
    replaceEarthMaterial: (newMaterial) => {
      if (!newMaterial) return;
      const oldMaterial = earthMesh.material;
      earthMesh.material = newMaterial;
      if (oldMaterial?.dispose) oldMaterial.dispose();
    },

    /**
     * Restore original Earth material
     */
    restoreBaseMaterial: () => {
      earthMesh.material = earthMaterial;
    },

    /**
     * Update animation (called every frame)
     * @param {number} time - Current time in seconds
     */
    update: (time) => {
      // Rotate each layer independently around tilted axis
      earthMesh.rotation.y += earthGroup.userData.earthRotationSpeed;
      cloudMesh.rotation.y += earthGroup.userData.cloudRotationSpeed;
      atmosphereMesh.rotation.y += earthGroup.userData.atmosphereRotationSpeed;
      
      // Update shader time uniforms
      if (earthMaterial.uniforms?.time) {
        earthMaterial.uniforms.time.value = time;
      }
      if (cloudMaterial.uniforms?.time) {
        cloudMaterial.uniforms.time.value = time;
      }
      if (atmosphereMaterial.uniforms?.time) {
        atmosphereMaterial.uniforms.time.value = time;
      }
    }
  };
  
  return earthGroup;
}

// ===== PUBLIC API =====

/**
 * Create complete Earth mesh with all layers
 * 
 * This is the main entry point for creating a realistic Earth visualization
 * with day/night cycle, clouds, topography, and atmospheric effects.
 * 
 * @param {number} [radius=CONFIG.EARTH_RADIUS] - Earth radius in scene units
 * @param {number} [rotationSpeed=CONFIG.BASE_ROTATION_SPEED] - Base rotation speed (radians/frame)
 * @returns {Promise<THREE.Group>} Earth group containing all layers
 * @throws {Error} If texture loading fails
 * 
 * @example
 * const earth = await createSeparateCloudEarthMesh(2.0, 0.001);
 * scene.add(earth);
 */
export async function createSeparateCloudEarthMesh(
  radius = CONFIG.EARTH_RADIUS,
  rotationSpeed = CONFIG.BASE_ROTATION_SPEED
) {
  console.log('🌍 Creating Earth with separate cloud layer...');

  // Load all textures in parallel
  const textures = await loadAllTextures();

  // Create geometries for all layers
  const geometries = createLayerGeometries(radius);

  // Create materials with shaders
  const materials = {
    earth: createEarthMaterial(textures),
    cloud: createCloudMaterial(textures.clouds),
    atmosphere: createAtmosphereMaterial()
  };

  // Create meshes
  const meshes = createLayerMeshes(geometries, materials);

  // Assemble complete Earth group
  const earthGroup = createEarthGroup(meshes, materials, rotationSpeed, textures);

  console.log('✓ Earth created successfully');
  return earthGroup;
}
