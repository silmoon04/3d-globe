# 3D globe with NASA vegetation data

An interactive Three.js globe for exploring monthly vegetation data. It combines an Earth renderer with preprocessed NASA VIIRS NDVI overlays, a timeline player and a movable lens for comparing the overlay with the surface below.

The bundled dataset contains 163 monthly frames, from February 2012 to August 2025. These are historical files served with the app, not a live satellite feed.

![Globe and vegetation overlay demo](3d%20Globe%20showcase.gif)

## Run locally

Use Python 3 and a browser with WebGL support. No npm installation or build step is needed to view the bundled data.

```bash
git clone --depth 1 https://github.com/silmoon04/3d-globe.git
cd 3d-globe
python -m http.server 8080
```

Open [localhost:8080](http://localhost:8080). Serve the repository root rather than opening `index.html` directly: the app loads ES modules, textures and overlay files over HTTP. Three.js 0.170 and OrbitControls are imported from jsDelivr, so the browser also needs internet access.

The repository includes the preprocessed imagery and raw overlay data, which make the download much larger than the application code.

## Explore the globe

- Drag to orbit and scroll to zoom.
- Use the bottom timeline to select a month, play or pause, change playback speed, or loop the sequence.
- Adjust overlay opacity in the control panel. Enable the lens and move the pointer over the globe to reveal the overlay within a circular area.
- Toggle clouds and atmosphere, or adjust the Earth and cloud rotation speeds.

| Key | Action |
| --- | --- |
| Space | Play or pause the timeline |
| Left / Right arrow | Previous or next month |
| Home / End | First or last month |
| L | Toggle the lens |

## Implementation

The application extends [bobbyroe's Three.js globe](https://github.com/bobbyroe/3d-globe-with-threejs) with satellite overlays and timeline controls.

- `index.js` creates the scene and connects the globe, UI and overlay controller.
- `src/shaders/` contains the GLSL for day/night textures, topographic displacement, clouds, atmospheric glow and overlay blending.
- `src/overlays/OverlayController.js` reads the manifest and loads the selected month's texture, metadata and raw values. `TimelapsePlayer.js` handles timeline navigation.
- `src/config.js` holds rendering settings. For example, `CONFIG.STARS.count` controls the number of background stars.
- `scripts/preprocess/` converts HDF/HDF5 source files into PNG overlays, Float32 data and JSON metadata. See the [preprocessing guide](scripts/README.md) to add data.

The rendering is illustrative. Overlay colours use per-frame bounds recorded in each `meta.json`, so the same colour is not necessarily the same NDVI value in every month. Fixed colour bounds are needed for a quantitative comparison across frames. Frames are loaded on demand; playback speed depends on file loading and the browser's rendering performance.

## Data and credits

- The bundled overlay is VIIRS NDVI, a vegetation index, sourced through NASA's Land Processes DAAC. Product metadata and dates are listed in [`overlays/manifest.json`](overlays/manifest.json).
- The base globe comes from [bobbyroe/3d-globe-with-threejs](https://github.com/bobbyroe/3d-globe-with-threejs).
- [Texture source notes](textures/README.md) list NASA Visible Earth, Blue Marble and Solar System Scope.
- Rendering uses [Three.js](https://threejs.org/).

The repository's existing [software licence](LICENSE.md) is BSD-2-Clause. Its copyright notice is retained. Satellite data and third-party textures have their own source terms; the software licence does not replace those terms.
