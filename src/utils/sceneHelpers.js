/**
 * Scene Setup Helpers
 * Factory functions for creating Three.js scene components
 * 
 * @module sceneHelpers
 */

import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { CONFIG } from "../config.js";

/**
 * Create Three.js scene with fog
 * @returns {THREE.Scene} Configured scene
 */
export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(CONFIG.FOG.color, CONFIG.FOG.density);
  return scene;
}

/**
 * Create perspective camera with configured settings
 * @returns {THREE.PerspectiveCamera} Configured camera
 */
export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    CONFIG.CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    CONFIG.CAMERA_NEAR,
    CONFIG.CAMERA_FAR
  );
  camera.position.z = CONFIG.CAMERA_INITIAL_Z;
  return camera;
}

/**
 * Create WebGL renderer with performance settings
 * @returns {THREE.WebGLRenderer} Configured renderer
 */
export function createRenderer() {
  const renderer = new THREE.WebGLRenderer(CONFIG.RENDERER);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

/**
 * Create orbit controls for camera
 * @param {THREE.Camera} camera - Camera to control
 * @param {THREE.WebGLRenderer} renderer - Renderer for event handling
 * @returns {OrbitControls} Configured orbit controls
 */
export function createControls(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = CONFIG.ENABLE_DAMPING;
  controls.minDistance = CONFIG.MIN_ZOOM;
  controls.maxDistance = CONFIG.MAX_ZOOM;
  return controls;
}

/**
 * Add lighting to scene
 * @param {THREE.Scene} scene - Scene to add lights to
 */
export function addLighting(scene) {
  // Ambient light for overall illumination
  const ambientLight = new THREE.AmbientLight(
    CONFIG.AMBIENT_LIGHT.color,
    CONFIG.AMBIENT_LIGHT.intensity
  );
  scene.add(ambientLight);

  // Main directional light
  const directionalLight = new THREE.DirectionalLight(
    CONFIG.DIRECTIONAL_LIGHT.color,
    CONFIG.DIRECTIONAL_LIGHT.intensity
  );
  const { x, y, z } = CONFIG.DIRECTIONAL_LIGHT.position;
  directionalLight.position.set(x, y, z);
  scene.add(directionalLight);

  // Fill light from opposite side
  const fillLight = new THREE.DirectionalLight(
    CONFIG.FILL_LIGHT.color,
    CONFIG.FILL_LIGHT.intensity
  );
  const fillPos = CONFIG.FILL_LIGHT.position;
  fillLight.position.set(fillPos.x, fillPos.y, fillPos.z);
  scene.add(fillLight);
}

/**
 * Setup window resize handler
 * @param {THREE.Camera} camera - Camera to update on resize
 * @param {THREE.WebGLRenderer} renderer - Renderer to resize
 */
export function setupWindowResize(camera, renderer) {
  function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', handleResize, false);
}

/**
 * Start animation loop
 * @param {THREE.Scene} scene - Scene to render
 * @param {THREE.Camera} camera - Camera for rendering
 * @param {THREE.WebGLRenderer} renderer - Renderer
 * @param {OrbitControls} controls - Orbit controls
 * @param {Object} [overlay] - Optional overlay controller
 */
export function startAnimationLoop(scene, camera, renderer, controls, overlay = null) {
  function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    // Update all objects with animation data
    scene.traverse((child) => {
      if (child.userData?.update) {
        child.userData.update(time);
      }
    });

    // Update overlay if exists
    if (overlay?.update) {
      overlay.update();
    }

    renderer.render(scene, camera);
    controls.update();
  }
  animate();
}

