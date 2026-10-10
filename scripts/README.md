# Preprocessing satellite data

These scripts convert downloaded HDF/HDF5 files into the files used by the globe. They are optional: the repository already contains the VIIRS NDVI overlays needed to run the app.

## Setup

Use a Python environment with the packages in `preprocess/requirements.txt`. From the repository root:

```bash
python -m pip install -r scripts/preprocess/requirements.txt
```

HDF4 products need `pyhdf` and the HDF4 native libraries. If those are unavailable through pip on your platform, a Conda environment with `conda install -c conda-forge pyhdf hdf4` is another option. HDF5 files are read with `h5py`.

Download source files separately from the relevant NASA data service and place them in a `datasets/` folder. Access requirements depend on the product. No downloader or credentials are included here.

## Convert files

Run these commands from the repository root. Replace `source.h5` and its date with the file you downloaded.

```bash
python scripts/preprocess/hdf_to_overlay.py --in datasets/source.h5 --id viirs_ndvi --date 2025-01-01 --out overlays
```

The converter can select a variable with `--var`, set output dimensions with `--width` and `--height`, and set colour bounds with `--min` and `--max`.

For a folder of recognised products, preview the files before processing them:

```bash
python scripts/preprocess/batch_process.py --folder datasets --out overlays --dry-run
python scripts/preprocess/batch_process.py --folder datasets --out overlays --parallel 4
```

The batch processor recognises these filename prefixes:

| Prefix | Product | Output ID |
| --- | --- | --- |
| VNP13C2 | VIIRS vegetation index | `viirs_ndvi` |
| MOD11C3 | MODIS land surface temperature | `modis_lst` |
| MOD10C1 | MODIS snow cover | `modis_snow` |
| MCD43C3 | MODIS albedo | `modis_albedo_sw` |
| MCD43C4 | MODIS nadir BRDF-adjusted reflectance | `modis_nbar_band1` |

Use `--product` to restrict a batch to one key in `PRODUCT_PATTERNS`. Only VIIRS NDVI is bundled with the current app; the other entries are conversion support.

## Output

Each converted date produces these files under `overlays/<id>/<YYYY-MM-DD>/`:

- `overlay_color.png`: a colour texture, 4096 by 2048 pixels by default.
- `overlay_raw.bin`: the resampled values stored as Float32 data.
- `meta.json`: dimensions, colour bounds, units and conversion notes.

The batch processor also writes `overlays/manifest.json`, which the browser reads to populate the timeline. After a single-file conversion, add its date to the matching overlay entry in the manifest yourself. Use a separate `--out` directory when experimenting if you want to keep the bundled dataset unchanged.

Check the batch output for failed conversions before using the generated timeline: detected dates can be listed even when their conversion failed. The current browser app loads the first overlay in the manifest and has no dataset selector, so put the product you want to view first.

The single-file converter uses each frame's 2nd and 98th percentiles unless explicit bounds are supplied. The VIIRS batch configuration uses this default; the MODIS configurations supply fixed bounds. For quantitative comparisons across months, convert the files with the same explicit `--min` and `--max`; otherwise a colour can represent different values in different frames. Choose bounds appropriate to the source product and check its scaling and units.
