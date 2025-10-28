#!/usr/bin/env python3
import argparse, json, os, sys
import numpy as np
from PIL import Image
import h5py

try:
    from pyhdf.SD import SD, SDC  # HDF4
    HAVE_PYHDF = True
except Exception:
    HAVE_PYHDF = False

def infer_defaults(in_path):
    base = os.path.basename(in_path)
    if base.startswith("VNP13C2"):
        return {"id":"viirs_ndvi","name":"VIIRS NDVI","units":"unitless","candidates":[
            "HDFEOS/GRIDS/VIIRS_Grid_monthly_VI_CMG/Data_Fields/CMG_0.05_Deg_Monthly_NDVI",
            "HDFEOS/GRIDS/VNP_Grid_16Day_1km_VI/Data Fields/NDVI"
        ]}
    if base.startswith("MOD10C1"):
        return {"id":"modis_snow","name":"MODIS Snow Cover","units":"%","candidates":[
            "MOD_Grid_Snow_5km/Data Fields/NDSI_Snow_Cover"
        ]}
    if base.startswith("MCD43C3"):
        return {"id":"modis_albedo_sw","name":"MODIS Albedo WSA (shortwave)","units":"albedo (0–1)","candidates":[
            "MCD_CMG_BRDF/Data Fields/Albedo_WSA_shortwave"
        ]}
    if base.startswith("MCD43C4"):
        return {"id":"modis_nbar_band1","name":"MODIS NBAR Band1 (proxy)","units":"reflectance (0–1)","candidates":[
            "MCD_CMG_Nbar/Data Fields/Nadir_Reflectance_Band1",
            "MCD_CMG_BRDF/Data Fields/Nadir_Reflectance_Band1"
        ]}
    return {"id":"overlay","name":"Overlay","units":"","candidates":[]}

def read_h5(path, var):
    with h5py.File(path, "r") as f:
        if var is None:
            out = []
            f.visititems(lambda n, o: out.append(n) if isinstance(o, h5py.Dataset) else None)
            return None, list(out), {}
        ds = f[var]
        data = ds[()]
        attrs = {k: (ds.attrs[k].item() if hasattr(ds.attrs[k], "shape") and ds.attrs[k].shape==() else ds.attrs[k]) for k in ds.attrs.keys()}
        return data, None, attrs

def read_hdf4(path, var):
    if not HAVE_PYHDF:
        raise RuntimeError("pyhdf not installed; cannot read HDF4")
    hdf = SD(path, SDC.READ)
    if var is None:
        return None, [k for k in hdf.datasets().keys()], {}
    sds = hdf.select(var)
    data = sds.get()
    attrs = sds.attributes()
    return data, None, attrs

def choose_var(candidates, available):
    if not candidates:
        for name in available:
            if any(x in name.lower() for x in ("ndvi","evi","snow","albedo","nadir","reflectance")):
                return name
        return available[0]
    for c in candidates:
        if c in available:
            return c
    for c in candidates:
        short = c.split("/")[-1]
        for a in available:
            if a.endswith(short):
                return a
    return available[0]

def apply_packed_scaling(arr, attrs):
    def to_scalar(val, default):
        """Convert array or scalar to scalar"""
        if val is None:
            return default
        if hasattr(val, '__len__') and not isinstance(val, str):
            return float(val[0]) if len(val) > 0 else default
        return float(val)
    
    sf = to_scalar(attrs.get('scale_factor', None), 1.0)
    ao = to_scalar(attrs.get('add_offset', None), 0.0)
    vr = attrs.get('valid_range', None)
    fv = attrs.get('_FillValue', None)
    
    a = arr.astype(np.float32)
    
    if fv is not None:
        fv_scalar = to_scalar(fv, None)
        if fv_scalar is not None:
            a = np.where(arr == fv_scalar, np.nan, a)
    
    if vr is not None and hasattr(vr, '__len__') and len(vr) == 2:
        a = np.where((a < vr[0]) | (a > vr[1]), np.nan, a)
    
    a = a * sf + ao
    return a

def resample_bilinear(data, W, H):
    valid = np.isfinite(data).astype(np.float32)
    data_fill = np.where(np.isfinite(data), data, 0.0).astype(np.float32)
    img = Image.fromarray(data_fill, mode='F').resize((W, H), resample=Image.BILINEAR)
    msk = Image.fromarray(valid, mode='F').resize((W, H), resample=Image.BILINEAR)
    out = np.array(img, dtype=np.float32)
    m = np.array(msk, dtype=np.float32)
    out[m < 0.5] = np.nan
    return out

def colorize_viridis(x01, alphaMask):
    stops = np.array([
      [68,1,84],[72,40,120],[62,74,137],[49,104,142],
      [38,130,142],[31,158,137],[53,183,121],[110,206,88],
      [181,222,43],[253,231,37]
    ], dtype=np.float32) / 255.0
    
    # Replace NaN with 0 for indexing (will be masked by alpha)
    x01_safe = np.nan_to_num(x01, nan=0.0)
    idx = x01_safe * (len(stops)-1)
    i0 = np.clip(np.floor(idx).astype(int), 0, len(stops)-1)
    i1 = np.clip(i0+1, 0, len(stops)-1)
    t = np.clip(idx - i0, 0, 1)
    
    rgb = (stops[i0]*(1-t[...,None]) + stops[i1]*t[...,None]).clip(0,1)
    a = (alphaMask*255).astype(np.uint8)
    rgba = np.dstack([(rgb[...,0]*255).astype(np.uint8),
                      (rgb[...,1]*255).astype(np.uint8),
                      (rgb[...,2]*255).astype(np.uint8),
                      a])
    return rgba

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", required=True)
    ap.add_argument("--var", dest="var_path", default=None)
    ap.add_argument("--id", dest="overlay_id", required=False)
    ap.add_argument("--date", required=True)
    ap.add_argument("--out", dest="out_root", default="../../public/overlays")
    ap.add_argument("--width", type=int, default=4096)
    ap.add_argument("--height", type=int, default=2048)
    ap.add_argument("--min", dest="vmin", type=float, default=None)
    ap.add_argument("--max", dest="vmax", type=float, default=None)
    args = ap.parse_args()

    defaults = infer_defaults(args.in_path)
    overlay_id = args.overlay_id or defaults["id"]
    name = defaults["name"]
    units = defaults["units"]

    ext = os.path.splitext(args.in_path)[1].lower()
    is_h5 = ext in (".h5", ".hdf5")
    if is_h5:
        data, avail, attrs = read_h5(args.in_path, args.var_path)
    else:
        data, avail, attrs = read_hdf4(args.in_path, args.var_path if args.var_path else None)

    if data is None:
        if not avail:
            print("No datasets found.")
            sys.exit(2)
        pick = choose_var(defaults["candidates"], avail)
        print(f"[i] Selected variable: {pick}")
        if is_h5:
            data, _, attrs = read_h5(args.in_path, pick)
        else:
            data, _, attrs = read_hdf4(args.in_path, pick)

    arr = apply_packed_scaling(data, attrs)

    outW, outH = args.width, args.height
    arr_rs = resample_bilinear(arr, outW, outH)

    if args.vmin is None:
        vmin = float(np.nanpercentile(arr_rs, 2))
    else:
        vmin = args.vmin
    if args.vmax is None:
        vmax = float(np.nanpercentile(arr_rs, 98))
    else:
        vmax = args.vmax

    x = (arr_rs - vmin) / max(1e-12, (vmax - vmin))
    x = np.clip(x, 0.0, 1.0)
    alpha = np.isfinite(arr_rs).astype(np.uint8)
    rgba = colorize_viridis(x, alpha)

    out_dir = os.path.join(args.out_root, overlay_id, args.date)
    os.makedirs(out_dir, exist_ok=True)

    Image.fromarray(rgba, mode='RGBA').save(os.path.join(out_dir, "overlay_color.png"))
    with open(os.path.join(out_dir, "overlay_raw.bin"), "wb") as f:
      arr_rs.astype(np.float32).tofile(f)

    meta = {
      "id": overlay_id,
      "name": name,
      "units": units,
      "date": args.date,
      "width": outW,
      "height": outH,
      "min": vmin,
      "max": vmax,
      "colormap": "viridis",
      "nodata": "NaN",
      "notes": "Resampled bilinear from CMG grid; CF packed scaling applied if attrs present."
    }
    with open(os.path.join(out_dir, "meta.json"), "w") as f:
      json.dump(meta, f, indent=2)

    print(f"[OK] Wrote {out_dir}")
    print(f"  min={vmin:.6g}, max={vmax:.6g}, nan%={np.isnan(arr_rs).mean()*100:.2f}%")

if __name__ == "__main__":
    main()


