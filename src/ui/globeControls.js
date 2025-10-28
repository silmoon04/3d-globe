/**
 * Globe UI Controls
 * Manages user interface controls for Earth globe parameters
 * 
 * @module globeControls
 */

/**
 * Setup atmosphere visibility toggle
 * @param {THREE.Group} earthGroup - Earth group containing atmosphere mesh
 * @private
 */
function setupAtmosphereToggle(earthGroup) {
  const toggle = document.getElementById('toggle-atmosphere');
  const atmosphereMesh = earthGroup.children.find(c => c.name === 'earthAtmosphere');

  if (toggle && atmosphereMesh) {
    toggle.addEventListener('change', (e) => {
      atmosphereMesh.visible = e.target.checked;
    });
  }
}

/**
 * Setup clouds visibility toggle
 * @param {THREE.Group} earthGroup - Earth group containing cloud mesh
 * @private
 */
function setupCloudsToggle(earthGroup) {
  const toggle = document.getElementById('toggle-clouds');
  const cloudMesh = earthGroup.children.find(c => c.name === 'earthClouds');

  if (toggle && cloudMesh) {
    toggle.addEventListener('change', (e) => {
      cloudMesh.visible = e.target.checked;
    });
  }
}

/**
 * Setup global speed multiplier control
 * @param {THREE.Group} earthGroup - Earth group
 * @param {HTMLInputElement} slider - Speed slider element
 * @param {HTMLElement} valueDisplay - Display element for value
 * @param {HTMLInputElement} earthSlider - Earth speed slider
 * @param {HTMLInputElement} cloudSlider - Cloud speed slider
 * @param {number} baseSpeed - Base rotation speed
 * @private
 */
function setupGlobalSpeedControl(earthGroup, slider, valueDisplay, earthSlider, cloudSlider, baseSpeed) {
  if (!slider || !valueDisplay || !earthGroup.userData) return;

  slider.addEventListener('input', (e) => {
    const globalMultiplier = parseFloat(e.target.value);
    valueDisplay.textContent = `${globalMultiplier.toFixed(1)}x`;

    const earthMultiplier = parseFloat(earthSlider.value);
    const cloudMultiplier = parseFloat(cloudSlider.value);

    earthGroup.userData.earthRotationSpeed = baseSpeed * globalMultiplier * earthMultiplier;
    earthGroup.userData.cloudRotationSpeed = baseSpeed * globalMultiplier * cloudMultiplier;
    earthGroup.userData.atmosphereRotationSpeed = baseSpeed * globalMultiplier * 0.8;
  });
}

/**
 * Setup Earth rotation speed control
 * @param {THREE.Group} earthGroup - Earth group
 * @param {HTMLInputElement} slider - Speed slider element
 * @param {HTMLElement} valueDisplay - Display element for value
 * @param {HTMLInputElement} globalSlider - Global speed slider
 * @param {number} baseSpeed - Base rotation speed
 * @private
 */
function setupEarthSpeedControl(earthGroup, slider, valueDisplay, globalSlider, baseSpeed) {
  if (!slider || !valueDisplay || !earthGroup.userData) return;

  slider.addEventListener('input', (e) => {
    const earthMultiplier = parseFloat(e.target.value);
    valueDisplay.textContent = `${earthMultiplier.toFixed(1)}x`;

    const globalMultiplier = parseFloat(globalSlider.value);
    earthGroup.userData.earthRotationSpeed = baseSpeed * globalMultiplier * earthMultiplier;
  });
}

/**
 * Setup cloud rotation speed control
 * @param {THREE.Group} earthGroup - Earth group
 * @param {HTMLInputElement} slider - Speed slider element
 * @param {HTMLElement} valueDisplay - Display element for value
 * @param {HTMLInputElement} globalSlider - Global speed slider
 * @param {number} baseSpeed - Base rotation speed
 * @private
 */
function setupCloudSpeedControl(earthGroup, slider, valueDisplay, globalSlider, baseSpeed) {
  if (!slider || !valueDisplay || !earthGroup.userData) return;

  slider.addEventListener('input', (e) => {
    const cloudMultiplier = parseFloat(e.target.value);
    valueDisplay.textContent = `${cloudMultiplier.toFixed(1)}x`;

    const globalMultiplier = parseFloat(globalSlider.value);
    earthGroup.userData.cloudRotationSpeed = baseSpeed * globalMultiplier * cloudMultiplier;
  });
}

/**
 * Setup overlay blend control
 * @param {Function} onChange - Callback when blend changes
 * @private
 */
function setupOverlayBlendControl(onChange) {
  const blendSlider = document.getElementById('overlay-blend');
  const blendValue = document.getElementById('overlay-blend-value');

  if (blendSlider && blendValue) {
    blendSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      blendValue.textContent = `${value}%`;
      window.overlayBlendValue = value / 100.0;
      if (onChange) onChange({ overlayMix: value / 100.0 });
    });
    // Initialize
    window.overlayBlendValue = 0.8;
  }
}

/**
 * Setup lens reveal control
 * @param {Function} onChange - Callback when lens changes
 * @private
 */
function setupLensControl(onChange) {
  const lensToggle = document.getElementById('toggle-lens');

  if (lensToggle) {
    lensToggle.addEventListener('change', (e) => {
      window.lensEnabled = e.target.checked;
      if (onChange) onChange({ lensEnabled: e.target.checked });
    });
    // Initialize
    window.lensEnabled = false;
    window.lensRadius = 0.12;
    
    // Keyboard shortcut
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'l' || e.key === 'L') && e.target.tagName !== 'INPUT') {
        lensToggle.checked = !lensToggle.checked;
        lensToggle.dispatchEvent(new Event('change'));
      }
    });
  }
}

/**
 * Setup all globe UI controls
 * 
 * Configures event listeners for:
 * - Atmosphere visibility toggle
 * - Cloud visibility toggle
 * - Overlay blend control
 * - Lens reveal toggle
 * - Global rotation speed control
 * - Individual layer speed controls
 * 
 * @param {THREE.Group} earthGroup - Earth group containing all meshes
 * @param {number} baseSpeed - Base rotation speed in radians per frame
 * @param {Function} onOverlayChange - Callback for overlay changes
 * 
 * @example
 * setupGlobeControls(earthGroup, 0.001, handleOverlayChange);
 */
export function setupGlobeControls(earthGroup, baseSpeed, onOverlayChange = null) {
  // Setup visibility toggles
  setupAtmosphereToggle(earthGroup);
  setupCloudsToggle(earthGroup);

  // Setup overlay controls
  setupOverlayBlendControl(onOverlayChange);
  setupLensControl(onOverlayChange);

  // Get all control elements
  const globalSlider = document.getElementById('global-speed');
  const earthSlider = document.getElementById('earth-speed');
  const cloudSlider = document.getElementById('cloud-speed');

  const globalValue = document.getElementById('global-speed-value');
  const earthValue = document.getElementById('earth-speed-value');
  const cloudValue = document.getElementById('cloud-speed-value');

  // Setup speed controls
  setupGlobalSpeedControl(earthGroup, globalSlider, globalValue, earthSlider, cloudSlider, baseSpeed);
  setupEarthSpeedControl(earthGroup, earthSlider, earthValue, globalSlider, baseSpeed);
  setupCloudSpeedControl(earthGroup, cloudSlider, cloudValue, globalSlider, baseSpeed);
}

