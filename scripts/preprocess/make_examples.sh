#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Example runs (paths relative to repo): adjust filenames to match your downloads in /datasets.

# 1) VIIRS NDVI (VNP13C2, HDF5)
python hdf_to_overlay.py \
  --in ../../datasets/VNP13C2.A2025213.002.2025261105537.h5 \
  --var "HDFEOS/GRIDS/VIIRS_Grid_monthly_VI_CMG/Data_Fields/CMG_0.05_Deg_Monthly_NDVI" \
  --id viirs_ndvi --date 2025-01-01 --out ../../overlays

# 2) MODIS Snow Cover (MOD10C1, HDF4)
python hdf_to_overlay.py \
  --in ../../datasets/MOD10C1.A2025276.061.2025278041144.hdf \
  --var "MOD_Grid_Snow_5km/Data Fields/NDSI_Snow_Cover" \
  --id modis_snow --date 2025-02-01 --out ../../overlays --min 0 --max 100


