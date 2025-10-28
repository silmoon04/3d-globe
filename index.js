/**
 * 3D Earth Globe with NASA Data Overlay System
 * 
 * Main entry point for the interactive Earth visualization featuring:
 * - Realistic Earth rendering with day/night shaders
 * - Dynamic cloud layer and atmospheric glow
 * - NASA satellite data overlay visualization
 * - Interactive timelapse player for climate data
 * 
 * @author NASA Space Apps Challenge Team
 * @version 2.0
 * 
 * Controls:
 * - Mouse drag: Rotate globe
 * - Scroll: Zoom in/out
 * - Space: Play/pause timelapse
 * - ←/→: Previous/next frame
 */

import * as THREE from "three";
import { CONFIG } from "./src/config.js";
import getStarfield from "./src/getStarfield.js";
import { createSimpleEarthMesh } from "./src/simpleEarth.js";
import { createSeparateCloudEarthMesh } from "./src/separateCloudEarth.js";
import { OverlayController } from "./src/overlays/OverlayController.js";
import { setupGlobeControls } from "./src/ui/globeControls.js";
import {
  createScene,
  createCamera,
  createRenderer,
  createControls,
  addLighting,
  setupWindowResize,
  startAnimationLoop
} from "./src/utils/sceneHelpers.js";

// ===== EARTH CREATION =====

/**
 * Create Earth mesh with fallback
 * Attempts to create full-featured Earth with shaders,
 * falls back to simple version if that fails
 * 
 * @returns {Promise<THREE.Group|THREE.Mesh>} Earth object
 */
async function createEarth() {
  try {
    const earth = await createSeparateCloudEarthMesh(
      CONFIG.EARTH_RADIUS,
      CONFIG.BASE_ROTATION_SPEED
    );
    console.log('✓ Full-featured Earth loaded');
    return earth;
  } catch (error) {
    console.warn('⚠ Full Earth failed, using fallback:', error.message);
    const earth = await createSimpleEarthMesh(
      CONFIG.EARTH_RADIUS,
      CONFIG.BASE_ROTATION_SPEED
    );
    console.log('✓ Simple Earth loaded');
    return earth;
  }
}

/**
 * Create and add starfield background
 * @param {THREE.Scene} scene - Scene to add stars to
 */
function addStarfield(scene) {
  const stars = getStarfield({
    numStars: CONFIG.STARS.count,
    fog: CONFIG.STARS.affectedByFog
  });
  scene.add(stars);
  console.log(`✓ ${CONFIG.STARS.count} stars added`);
}

// ===== OVERLAY SYSTEM =====

/**
 * Initialize overlay system
 * @param {THREE.Scene} scene - Three.js scene
 * @param {THREE.Camera} camera - Camera
 * @param {THREE.WebGLRenderer} renderer - Renderer
 * @param {THREE.Group} earthGroup - Earth group
 * @returns {OverlayController|null} Overlay controller or null if failed
 */
function initializeOverlaySystem(scene, camera, renderer, earthGroup) {
  try {
    const overlay = new OverlayController({
      scene,
      camera,
      renderer,
      earthGroup
    });
    console.log('✓ Overlay system initialized');
    return overlay;
  } catch (error) {
    console.warn('⚠ Overlay system failed to initialize:', error.message);
    return null;
  }
}

// ===== INITIALIZATION =====

/**
 * Initialize and start the application
 * 
 * This is the main initialization function that:
 * 1. Creates the 3D scene, camera, and renderer
 * 2. Loads and adds the Earth with all layers
 * 3. Sets up UI controls
 * 4. Initializes the overlay system
 * 5. Adds starfield background
 * 6. Starts the animation loop
 * 
 * @async
 * @throws {Error} If critical components fail to initialize
 */
async function init() {
  console.log('🚀 Initializing 3D Earth Globe...');

  // 1. Create 3D environment
  const scene = createScene();
  const camera = createCamera();
  const renderer = createRenderer();
  const controls = createControls(camera, renderer);
  addLighting(scene);
  console.log('✓ Scene initialized');

  // 2. Create and add Earth
  const earthGroup = await createEarth();
  scene.add(earthGroup);

  // 3. Initialize overlay system (before controls)
  const overlay = initializeOverlaySystem(scene, camera, renderer, earthGroup);

  // 4. Setup globe UI controls (with overlay callback)
  setupGlobeControls(earthGroup, CONFIG.BASE_ROTATION_SPEED, (changes) => {
    if (overlay?.material) {
      if (changes.overlayMix !== undefined) {
        overlay.material.uniforms.overlayMix.value = changes.overlayMix;
      }
      if (changes.lensEnabled !== undefined) {
        overlay.material.uniforms.lensEnabled.value = changes.lensEnabled ? 1.0 : 0.0;
      }
    }
  });
  console.log('✓ Controls configured');

  // 5. Add starfield background
  addStarfield(scene);

  // 6. Start animation loop and setup window resize
  startAnimationLoop(scene, camera, renderer, controls, overlay);
  setupWindowResize(camera, renderer);

  console.log('✓ Application initialized successfully');
}

// ===== START APPLICATION =====

// Initialize application on page load
init().catch(error => {
  console.error('❌ Fatal error during initialization:', error);
  // Display user-friendly error message
  document.body.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      font-family: system-ui, sans-serif;
      max-width: 500px;
    ">
      <h2>⚠️ Initialization Error</h2>
      <p>The 3D Earth Globe failed to load.</p>
      <p style="color: #ff6b6b; font-size: 14px; margin-top: 20px;">
        ${error.message}
      </p>
      <p style="font-size: 12px; opacity: 0.7; margin-top: 20px;">
        Please check the console for more details.
      </p>
    </div>
  `;
});
