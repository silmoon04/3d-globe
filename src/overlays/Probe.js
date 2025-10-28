import * as THREE from "three";
import { vec3ToLatLon, latLonToUV } from "../utils/geo.js";

// Probe: raycast Earth on click, show lat/lon and sample overlay_raw.bin via Float32Array.
export class Probe {
  constructor({ scene, camera, renderer, earthGroup, getCurrentRaw, getMeta }) {
    this.scene = scene; this.camera = camera; this.renderer = renderer;
    this.earthGroup = earthGroup;
    this.getCurrentRaw = getCurrentRaw; // () => { data: Float32Array|null, W, H }
    this.getMeta = getMeta; // () => meta

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.tooltip = this._makeTooltip();
    this.pin = null;

    const canvas = renderer.domElement || document.querySelector('canvas');
    canvas.addEventListener('pointerdown', (e) => this._onDown(e));
  }

  _makeTooltip() {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.transform = 'translate(8px,8px)';
    el.style.pointerEvents = 'none';
    el.style.background = 'rgba(0,0,0,0.7)';
    el.style.color = '#fff';
    el.style.font = '12px/1.4 system-ui, sans-serif';
    el.style.padding = '6px 8px';
    el.style.borderRadius = '6px';
    el.style.zIndex = 20;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  _onDown(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const earth = this.earthGroup.userData?.earthMesh;
    if (!earth) return;

    const hits = this.raycaster.intersectObject(earth, true);
    if (hits.length === 0) return;

    const p = hits[0].point.clone();
    const { lat, lon } = vec3ToLatLon(p);
    const { u, v } = latLonToUV(lat, lon);

    const raw = this.getCurrentRaw ? this.getCurrentRaw() : null;
    const meta = this.getMeta ? this.getMeta() : null;

    let valStr = '';
    if (raw && raw.data && meta) {
      const value = bilinearSample(raw.data, raw.W, raw.H, u, v);
      if (Number.isFinite(value)) {
        const units = meta.units || '';
        valStr = `<br/><b>value:</b> ${formatVal(value)} ${units}`;
      }
    }

    this.tooltip.innerHTML = `<b>lat:</b> ${lat.toFixed(3)}°, <b>lon:</b> ${lon.toFixed(3)}°${valStr}`;
    this.tooltip.style.left = `${e.clientX}px`;
    this.tooltip.style.top = `${e.clientY}px`;
    this.tooltip.style.display = 'block';

    // drop/update pin
    if (!this.pin) {
      const geom = new THREE.SphereGeometry(0.02, 12, 12);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      this.pin = new THREE.Mesh(geom, mat);
      this.earthGroup.add(this.pin);
    }
    this.pin.position.copy(p.clone().setLength(this.earthGroup.children[0].geometry.parameters.radius * 1.01));
  }
}

function formatVal(x) {
  const ax = Math.abs(x);
  if (ax >= 100) return x.toFixed(1);
  if (ax >= 1) return x.toFixed(3);
  return x.toExponential(2);
}

// Bilinear sample from Float32Array (row-major H×W), u in [0,1], v in [0,1] (v=0 top).
export function bilinearSample(arr, W, H, u, v) {
  const x = u * (W - 1);
  const y = (1 - v) * (H - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
  const tx = x - x0, ty = y - y0;
  const i00 = y0 * W + x0, i10 = y0 * W + x1;
  const i01 = y1 * W + x0, i11 = y1 * W + x1;
  const v00 = arr[i00], v10 = arr[i10], v01 = arr[i01], v11 = arr[i11];
  const vals = [v00, v10, v01, v11].filter(Number.isFinite);
  if (vals.length === 0) return NaN;
  const avg = vals.reduce((s, x) => s + x, 0) / vals.length;
  const a = Number.isFinite(v00) ? v00 : avg;
  const b = Number.isFinite(v10) ? v10 : avg;
  const c = Number.isFinite(v01) ? v01 : avg;
  const d = Number.isFinite(v11) ? v11 : avg;
  const top = a * (1 - tx) + b * tx;
  const bottom = c * (1 - tx) + d * tx;
  return top * (1 - ty) + bottom * ty;
}


