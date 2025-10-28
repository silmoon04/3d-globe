import * as THREE from "three";
import { createOverlayMaterial } from "./OverlayMaterial.js";
import { TimelapsePlayer } from "./TimelapsePlayer.js";
import { vec3ToLatLon, latLonToUV } from "../utils/geo.js";
import { TextureLoaderUtil } from "../utils/textureLoader.js";

export class OverlayController {
  constructor({ scene, camera, renderer, earthGroup }) {
    this.scene = scene; 
    this.camera = camera; 
    this.renderer = renderer; 
    this.earthGroup = earthGroup;
    if (!earthGroup?.userData?.earthMesh) throw new Error("Earth mesh not found; overlays require the primary Earth.");
    
    this.timelapse = new TimelapsePlayer(this);
    this.manifest = null;
    this.current = { overlayId: null, date: null, meta: null, raw: null };
    this.currentOverlay = null;
    this.material = null;

    this._initMaterial();
    this._loadManifest();
    this._wireLensMove();
  }

  _initMaterial() {
    const { dayTexture, nightTexture, topographyTexture } = this.earthGroup.userData.getTextures();
    [dayTexture, nightTexture].forEach(t => { if (t) t.colorSpace = THREE.SRGBColorSpace; });
    this.material = createOverlayMaterial({
      dayTex: dayTexture, nightTex: nightTexture, topoTex: topographyTexture
    });
    this.earthGroup.userData.replaceEarthMaterial(this.material);
  }

  async _loadManifest() {
    try {
      const res = await fetch('./overlays/manifest.json');
      this.manifest = await res.json();
      const first = this.manifest.overlays[0];
      this.currentOverlay = first;
      
      // Initialize timelapse player
      this.timelapse.createUI(document.body);
      this.timelapse.setOverlay(first.id, first.dates);
      
      // Load first overlay
      await this.loadOverlay(first.id, first.dates[0]);
      
      console.log(`✓ Loaded ${first.name}: ${first.dates.length} dates`);
    } catch (e) {
      console.error("❌ Manifest load failed", e);
    }
  }

  // Public method for timelapse to call
  async loadOverlay(overlayId, date) {
    await this._loadOverlay(overlayId, date);
  }

  async _loadOverlay(overlayId, date) {
    const base = `./overlays/${overlayId}/${date}`;
    try {
      const [img, meta, raw] = await Promise.all([
        TextureLoaderUtil.loadOverlay(`${base}/overlay_color.png`, true),
        fetch(`${base}/meta.json`).then(r => r.json()),
        fetch(`${base}/overlay_raw.bin`).then(r => r.ok ? r.arrayBuffer() : null)
      ]);
      this.material.uniforms.overlayTex.value = img;
      this.current.overlayId = overlayId;
      this.current.date = date;
      this.current.meta = meta;
      this.current.raw = raw ? { data: new Float32Array(raw), W: meta.width, H: meta.height } : null;
    } catch (e) {
      console.warn("⚠ Overlay load failed:", e.message);
      const empty = new THREE.DataTexture(new Uint8Array([0,0,0,0]), 1, 1, THREE.RGBAFormat);
      empty.needsUpdate = true; 
      empty.colorSpace = THREE.SRGBColorSpace;
      this.material.uniforms.overlayTex.value = empty;
      this.current.raw = null;
    }
  }

  _wireLensMove() {
    const canvas = this.renderer.domElement || document.querySelector('canvas');
    canvas.addEventListener('pointermove', (e) => {
      if (this.material.uniforms.lensEnabled.value < 0.5) return;
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, this.camera);
      const hit = ray.intersectObject(this.earthGroup.userData.earthMesh, true)[0];
      if (!hit) return;
      const { lat, lon } = vec3ToLatLon(hit.point);
      const { u, v } = latLonToUV(lat, lon);
      this.material.uniforms.lensCenter.value.set(u, v);
    });
  }

  update() {
    const t = performance.now() * 0.001;
    if (this.material?.uniforms?.time) this.material.uniforms.time.value = t;
  }
}

