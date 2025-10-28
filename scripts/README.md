# Scripts Directory

Tools for downloading and processing NASA satellite data.

## 📁 Files

### Download Scripts
- **`modis_lst_urls.txt`** - List of 308 MODIS LST download URLs (2000-2025)
- **`Download-LST.ps1`** - PowerShell script to download all files from URL list

### Preprocessing
- **`preprocess/`** - Data conversion tools
  - `hdf_to_overlay.py` - Convert single HDF/HDF5 → web overlay
  - `batch_process.py` - Auto-detect & process entire folders
  - `requirements.txt` - Python dependencies
  - `make_examples.sh` - Example commands

## 🚀 Usage

### Download Data (Windows)

```powershell
# Using PowerShell (recommended)
cd scripts
powershell -ExecutionPolicy Bypass -File Download-LST.ps1
# Enter your NASA Earthdata credentials when prompted
```

**Or download manually:**
1. Get URLs from `modis_lst_urls.txt`
2. Use browser/wget/curl to download to `../datasets/`

### Process Data

```bash
cd preprocess

# Single file
python hdf_to_overlay.py \
  --in ../../datasets/MOD11C3.A2025244.061.hdf \
  --id modis_lst \
  --date 2025-09-01 \
  --out ../../overlays

# Entire folder (auto-detects product types)
python batch_process.py \
  --folder ../../datasets \
  --out ../../overlays \
  --parallel 4

# Specific product only
python batch_process.py \
  --folder ../../datasets \
  --out ../../overlays \
  --product modis_lst \
  --parallel 4

# Dry run (preview without processing)
python batch_process.py \
  --folder ../../datasets \
  --out ../../overlays \
  --dry-run
```

## 📊 Supported Products

`batch_process.py` auto-detects these NASA products:

| Product Code | Full Name | File Pattern | Output ID |
|-------------|-----------|--------------|-----------|
| `modis_lst` | MODIS Land Surface Temperature | `MOD11C3.A*.hdf` | `modis_lst` |
| `viirs_ndvi` | VIIRS Vegetation Index | `VNP13C2.A*.h5` | `viirs_ndvi` |
| `modis_snow` | MODIS Snow Cover | `MOD10C1.A*.hdf` | `modis_snow` |
| `modis_albedo` | MODIS Albedo | `MCD43C3.A*.hdf` | `modis_albedo_sw` |
| `modis_nbar` | MODIS NBAR | `MCD43C4.A*.hdf` | `modis_nbar_band1` |

### Add New Products

Edit `preprocess/batch_process.py` → `PRODUCT_PATTERNS`:

```python
PRODUCT_PATTERNS = {
    'your_product': {
        'pattern': r'YOUR_FILE\.A(\d{7})\.',  # Regex for filename
        'id': 'your_id',
        'name': 'Your Product Name',
        'units': 'your units',
        'var': 'HDF/path/to/variable',  # Dataset path in HDF
        'extension': '.hdf',  # or .h5
        'min': 0,    # Data range min (optional)
        'max': 100   # Data range max (optional)
    }
}
```

## 🔧 Advanced Options

### Custom Data Range

```bash
python hdf_to_overlay.py \
  --in dataset.hdf \
  --var "HDFEOS/GRIDS/Grid/Data_Fields/Variable" \
  --id my_overlay \
  --date 2025-01-01 \
  --out ../../overlays \
  --min -50 \
  --max 50
```

### Specify Variable Path

```bash
# For HDF5 files, find variable with:
h5dump -n dataset.h5

# For HDF4 files:
ncdump -h dataset.hdf

# Then use path in --var:
python hdf_to_overlay.py \
  --in dataset.h5 \
  --var "HDFEOS/GRIDS/MyGrid/Data_Fields/MyVariable" \
  --id my_data \
  --date 2025-01-01 \
  --out ../../overlays
```

### Parallel Processing

```bash
# Use more workers for faster processing
python batch_process.py \
  --folder ../../datasets \
  --out ../../overlays \
  --parallel 8  # 8 CPU cores

# Or fewer for less CPU usage
python batch_process.py \
  --folder ../../datasets \
  --out ../../overlays \
  --parallel 2
```

## 📦 Output Format

Each processed dataset creates:

```
overlays/
└── [overlay_id]/
    └── [YYYY-MM-DD]/
        ├── overlay_color.png    # 3600×1800 RGBA visualization
        ├── overlay_raw.bin      # Float32 raw data (for probing)
        └── meta.json            # Metadata
```

**meta.json** contains:
```json
{
  "width": 3600,
  "height": 1800,
  "min": 230.5,
  "max": 329.8,
  "units": "Kelvin",
  "projection": "equirectangular"
}
```

## 🐛 Troubleshooting

**"pyhdf not installed"**
```bash
# HDF4 files (MODIS) need conda:
conda install -c conda-forge pyhdf hdf4
```

**"Unable to open HDF file"**
- File might be corrupted - re-download
- Check file permissions
- Verify it's actually HDF format: `file dataset.hdf`

**"KeyError: variable not found"**
- List variables: `h5dump -n file.h5` or `ncdump -h file.hdf`
- Update `--var` path or let script auto-detect (omit `--var`)

**Processing stuck**
- Reduce `--parallel` value
- Check available RAM (each worker uses ~500 MB)
- Monitor with Task Manager/htop

**Wrong colors**
- Edit `hdf_to_overlay.py` → `colorize_viridis()` function
- Adjust `--min` and `--max` ranges

## 📚 References

- **HDF5**: https://www.hdfgroup.org/solutions/hdf5/
- **NASA Data Formats**: https://earthdata.nasa.gov/esdis/esco/standards-and-practices
- **MODIS Products**: https://modis.gsfc.nasa.gov/data/dataprod/
- **VIIRS Products**: https://viirsland.gsfc.nasa.gov/

---

**Need help?** Check main `README.md` or open an issue.




