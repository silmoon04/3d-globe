# 3D Earth Globe with NASA Data Overlay System

Interactive 3D Earth visualization built with Three.js featuring real-time NASA satellite data overlays and timelapse playback for climate data analysis.

[![Three.js](https://img.shields.io/badge/Three.js-v0.170-blue)](https://threejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE.md)

---

## Features

### Rendering
- **Day/Night Shader** - Dynamic lighting with city lights and realistic terminator
- **Topographic Terrain** - Vertex displacement based on elevation data
- **Atmospheric Effects** - Fresnel-based edge glow
- **Cloud Layer** - Independent rotation at 1.5x Earth speed
- **Scientific Accuracy** - 23.5° axial tilt implementation

### Data Visualization
- **VIIRS NDVI Data** - 163 months of global vegetation index (2012-2025)
- **Timelapse Player** - Animate 13+ years of climate data with playback controls
- **Blend Control** - Variable opacity overlay mixing (0-100%)
- **Lens Reveal** - Side-by-side comparison tool

### Performance
- 60 FPS rendering with GPU acceleration
- Optimized geometry (configurable mesh quality)
- Smart frame caching for smooth playback
- On-demand texture streaming

---

## Installation

### Requirements
- Python 3.8+ (for data processing)
- Modern web browser with WebGL support
- NASA Earthdata account (optional, for data download)

### Setup

```bash
# Clone repository
git clone https://github.com/silmoon04/3d-globe.git
cd 3d-globe

# Install Python dependencies
cd scripts/preprocess
pip install -r requirements.txt

# For HDF4 support (MODIS data)
conda create -n nasa python=3.12
conda activate nasa
conda install -c conda-forge pyhdf hdf4 numpy pillow h5py xarray
```

### Running

```bash
# Start local server from project root
python -m http.server 8080

# Open browser to http://localhost:8080
```

---

## Architecture

```
src/
├── config.js                   # Centralized configuration
├── shaders/                    # GLSL shaders
│   ├── earthShaders.js         # Surface, clouds, atmosphere
│   └── overlayShaders.js       # Data overlay blending
├── utils/                      # Core utilities
│   ├── geo.js                  # Coordinate conversions
│   ├── textureLoader.js        # Texture loading with retry logic
│   └── sceneHelpers.js         # Three.js factories
├── ui/                         # User interface
│   └── globeControls.js        # Control event handlers
├── overlays/                   # NASA data system
│   ├── OverlayController.js    # Main controller
│   ├── OverlayMaterial.js      # Shader material
│   ├── Probe.js                # Click-to-probe (optional)
│   └── TimelapsePlayer.js      # Animation player
├── separateCloudEarth.js       # Main Earth renderer
├── simpleEarth.js              # Fallback renderer
└── getStarfield.js             # Background stars
```

### Key Design Features

- **Modular Architecture** - 15 focused modules with clear separation of concerns
- **Factory Pattern** - Consistent object creation through helper functions
- **Centralized Configuration** - All settings managed in `config.js`
- **100% JSDoc Coverage** - Complete inline documentation
- **DRY Principles** - Reusable utilities eliminate code duplication

---

## Configuration

All settings are centralized in `src/config.js`:

```javascript
export const CONFIG = {
  // Geometry
  EARTH_RADIUS: 2.0,
  SPHERE_SEGMENTS: { width: 64, height: 32 },
  
  // Animation
  BASE_ROTATION_SPEED: 0.001,
  CLOUD_SPEED_MULTIPLIER: 1.5,
  
  // Camera
  CAMERA_FOV: 35,
  MIN_ZOOM: 3.5,
  MAX_ZOOM: 10,
  
  // Performance
  STAR_COUNT: 1000,
  TIMELAPSE_CACHE_SIZE: 5
};
```

---

## Data Processing

### Primary Dataset: VIIRS NDVI

**VNP13C2** - Vegetation Index (Normalized Difference Vegetation Index)
- **Resolution**: 0.05° CMG (~5.6km at equator)
- **Temporal**: Monthly composites
- **Coverage**: 163 months (February 2012 - August 2025)
- **Format**: HDF5
- **Data Range**: -0.07 to 0.81 (vegetation health indicator)

The system supports other NASA CMG products (MOD11C3, MOD10C1, MCD43C3) via the batch processor.

### Processing Pipeline

```bash
# Single file conversion
cd scripts/preprocess
python hdf_to_overlay.py --in ../../datasets/file.hdf --id overlay_name --date 2025-01-01 --out ../../overlays

# Batch processing (auto-detects product type)
python batch_process.py --folder ../../datasets --out ../../overlays --parallel 4
```

**Output:**
- `overlay_color.png` - Visualization texture (4096x2048)
- `overlay_raw.bin` - Raw Float32 data
- `meta.json` - Metadata (range, units, projection)

---

## Controls

### Mouse
- **Drag** - Rotate globe
- **Scroll** - Zoom in/out

### Keyboard
- `Space` - Play/pause timelapse
- `←` `→` - Navigate frames
- `Home` `End` - Jump to first/last frame
- `L` - Toggle lens reveal

### UI Panel (Top-Right)
- Show/hide atmosphere
- Show/hide clouds  
- Overlay blend (0-100%)
- Lens reveal toggle
- Global speed multiplier
- Earth/cloud rotation speeds

### Timelapse Player (Bottom)
- Play/pause button
- Previous/next frame
- Timeline scrubber
- Speed selector (0.25x - 10x)
- Loop checkbox

---

## API Examples

### Creating Custom Earth

```javascript
import { createSeparateCloudEarthMesh } from './src/separateCloudEarth.js';
import { CONFIG } from './src/config.js';

const earth = await createSeparateCloudEarthMesh(
  CONFIG.EARTH_RADIUS,
  CONFIG.BASE_ROTATION_SPEED
);
scene.add(earth);
```

### Loading Textures

```javascript
import { TextureLoaderUtil } from './src/utils/textureLoader.js';

// Simple load with automatic error handling
const texture = await TextureLoaderUtil.load('./texture.jpg');

// Auto-retry with multiple paths
const texture = await TextureLoaderUtil.load([
  './texture.jpg',
  './texture.png',
  './fallback.jpg'
]);
```

### Using Configuration

```javascript
import { CONFIG, getLayerRadius } from './src/config.js';

const cloudRadius = getLayerRadius('cloud'); // 2.1 (1.05 × 2.0)
const starCount = CONFIG.STAR_COUNT;          // 1000
```

---

## Development

### Code Standards

- **Functions** - Small, focused (< 30 lines)
- **Documentation** - JSDoc required for all public functions
- **Modules** - Single responsibility per file
- **Naming** - Descriptive, clear purpose

### Adding Features

1. Add configuration to `src/config.js` if needed
2. Create module in appropriate directory
3. Document with JSDoc
4. Import and integrate
5. Test thoroughly

### JSDoc Example

```javascript
/**
 * Create Earth mesh with all layers
 * 
 * @param {number} radius - Earth radius in scene units
 * @param {number} rotationSpeed - Base rotation speed (radians/frame)
 * @returns {Promise<THREE.Group>} Earth group containing all layers
 * @throws {Error} If texture loading fails
 * 
 * @example
 * const earth = await createSeparateCloudEarthMesh(2.0, 0.001);
 * scene.add(earth);
 */
export async function createSeparateCloudEarthMesh(radius, rotationSpeed) {
  // Implementation
}
```

---

## Troubleshooting

### Globe Not Rendering

1. Check browser console for errors (F12)
2. Verify WebGL support: `chrome://gpu`
3. Ensure using HTTP server (not `file://` protocol)
4. Check texture files exist in `textures/` directory

### Overlay Issues

1. Verify `overlays/manifest.json` exists
2. Check overlay data files are present
3. Re-run batch processor if needed
4. Check browser network tab for 404 errors

### Performance Issues

Adjust settings in `src/config.js`:
```javascript
STAR_COUNT: 500,                        // Reduce stars
SPHERE_SEGMENTS: { width: 32, height: 16 },  // Lower quality
```

---

## Technical Details

### Technologies
- Three.js 0.170 - 3D rendering engine
- WebGL 2.0 - GPU acceleration
- GLSL - Custom shader programming
- Python 3.12 - Data processing
- NumPy/Pillow - Scientific computing

### Performance Metrics
- **Rendering**: 60 FPS on modern hardware
- **Memory**: ~50-100 MB base, ~200 MB with cache
- **Processing**: ~30-60 sec per HDF file
- **Batch (300 files)**: ~40-60 min with 4 workers

---

## Contributing

Contributions welcome. Please:
1. Follow existing code style
2. Add JSDoc documentation
3. Keep functions small and focused
4. Test thoroughly before submitting
5. Include clear commit messages

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## License

MIT License - See [LICENSE.md](LICENSE.md) for details.

### Credits

- **Original Code**: Based on [@bobbyroe's 3d-globe-with-threejs](https://github.com/bobbyroe/3d-globe-with-threejs)
- **Data**: NASA EOSDIS Land Processes DAAC
- **Textures**: NASA Visible Earth
- **Engine**: Three.js by mrdoob and contributors

---

## References

- [Three.js Documentation](https://threejs.org/docs/)
- [NASA Earthdata](https://earthdata.nasa.gov/)
- [MODIS Products](https://modis.gsfc.nasa.gov/)
- [WebGL Specification](https://www.khronos.org/webgl/)

---

**For questions or issues, please open a GitHub issue.**
