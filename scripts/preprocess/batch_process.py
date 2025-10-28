#!/usr/bin/env python3
"""
Smart batch processor for NASA HDF/HDF5 datasets.
Automatically detects product type, extracts dates, and processes all files in a folder.

Usage:
    python batch_process.py --folder ../../datasets --out ../../overlays
    python batch_process.py --folder ../../datasets --out ../../overlays --product viirs_ndvi --parallel 4
"""
import argparse
import os
import re
import sys
from pathlib import Path
from datetime import datetime, timedelta
import subprocess
from concurrent.futures import ProcessPoolExecutor, as_completed
import json

# Product detection patterns and settings
PRODUCT_PATTERNS = {
    'viirs_ndvi': {
        'pattern': r'VNP13C2\.A(\d{7})\.',  # VNP13C2.A2025213.002.xxx.h5
        'id': 'viirs_ndvi',
        'name': 'VIIRS NDVI',
        'units': 'unitless',
        'var': None,  # Auto-detect variable name
        'extension': '.h5',
        'min': None,
        'max': None
    },
    'modis_snow': {
        'pattern': r'MOD10C1\.A(\d{7})\.',  # MOD10C1.A2025276.061.xxx.hdf
        'id': 'modis_snow',
        'name': 'MODIS Snow Cover',
        'units': '%',
        'var': 'MOD_Grid_Snow_5km/Data Fields/NDSI_Snow_Cover',
        'extension': '.hdf',
        'min': 0,
        'max': 100
    },
    'modis_albedo': {
        'pattern': r'MCD43C3\.A(\d{7})\.',  # MCD43C3.A2025269.061.xxx.hdf
        'id': 'modis_albedo_sw',
        'name': 'MODIS Albedo (Shortwave WSA)',
        'units': 'albedo (0–1)',
        'var': 'MCD_CMG_BRDF/Data Fields/Albedo_WSA_shortwave',
        'extension': '.hdf',
        'min': 0,
        'max': 1
    },
    'modis_nbar': {
        'pattern': r'MCD43C4\.A(\d{7})\.',  # MCD43C4.A2025269.061.xxx.hdf
        'id': 'modis_nbar_band1',
        'name': 'MODIS NBAR Band1',
        'units': 'reflectance (0–1)',
        'var': 'MCD_CMG_Nbar/Data Fields/Nadir_Reflectance_Band1',
        'extension': '.hdf',
        'min': 0,
        'max': 0.4
    },
    'modis_lst': {
        'pattern': r'MOD11C3\.A(\d{7})\.',  # MOD11C3.A2025244.061.xxx.hdf
        'id': 'modis_lst',
        'name': 'MODIS Land Surface Temperature',
        'units': 'Kelvin',
        'var': 'LST_Day_CMG',
        'extension': '.hdf',
        'min': 230,
        'max': 330
    }
}


def parse_julian_date(year_day_str):
    """Convert YYYYDDD (year + day-of-year) to YYYY-MM-DD"""
    year = int(year_day_str[:4])
    day_of_year = int(year_day_str[4:])
    date = datetime(year, 1, 1) + timedelta(days=day_of_year - 1)
    return date.strftime('%Y-%m-%d')


def detect_product(filename):
    """Detect product type from filename"""
    for product_key, config in PRODUCT_PATTERNS.items():
        match = re.search(config['pattern'], filename)
        if match:
            julian_date = match.group(1)
            date = parse_julian_date(julian_date)
            return product_key, config, date
    return None, None, None


def scan_folder(folder_path, product_filter=None):
    """Scan folder for HDF/HDF5 files and group by product type"""
    folder = Path(folder_path)
    files_by_product = {}
    
    for file_path in folder.glob('*'):
        if file_path.suffix.lower() not in ['.h5', '.hdf', '.hdf5']:
            continue
            
        product_key, config, date = detect_product(file_path.name)
        if not product_key:
            print(f"[!] Unknown product: {file_path.name} (skipping)")
            continue
            
        if product_filter and product_key != product_filter:
            continue
            
        if product_key not in files_by_product:
            files_by_product[product_key] = []
            
        files_by_product[product_key].append({
            'path': str(file_path),
            'date': date,
            'config': config
        })
    
    # Sort by date
    for product_key in files_by_product:
        files_by_product[product_key].sort(key=lambda x: x['date'])
    
    return files_by_product


def process_file(file_info, out_dir, script_path):
    """Process a single file"""
    config = file_info['config']
    file_path = file_info['path']
    date = file_info['date']
    
    cmd = [
        sys.executable,
        script_path,
        '--in', file_path,
        '--id', config['id'],
        '--date', date,
        '--out', out_dir
    ]
    
    if config['var']:
        cmd.extend(['--var', config['var']])
    if config['min'] is not None:
        cmd.extend(['--min', str(config['min'])])
    if config['max'] is not None:
        cmd.extend(['--max', str(config['max'])])
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode == 0:
            return True, date, None
        else:
            return False, date, result.stderr
    except Exception as e:
        return False, date, str(e)


def update_manifest(out_dir, files_by_product):
    """Update or create manifest.json with all processed dates"""
    manifest_path = Path(out_dir) / 'manifest.json'
    
    # Load existing manifest or create new
    if manifest_path.exists():
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
    else:
        manifest = {'overlays': []}
    
    # Update each product's dates
    for product_key, files in files_by_product.items():
        config = files[0]['config']
        dates = sorted([f['date'] for f in files])
        
        # Find existing overlay entry or create new
        overlay = next((o for o in manifest['overlays'] if o['id'] == config['id']), None)
        if overlay:
            # Merge dates (keep unique, sorted)
            existing_dates = set(overlay.get('dates', []))
            all_dates = sorted(set(dates) | existing_dates)
            overlay['dates'] = all_dates
        else:
            # Create new entry
            manifest['overlays'].append({
                'id': config['id'],
                'name': config['name'],
                'units': config['units'],
                'legend': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBe6Xk6XkAAAAASUVORK5CYII=',
                'dates': dates
            })
    
    # Write updated manifest
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"[+] Updated manifest: {manifest_path}")


def main():
    parser = argparse.ArgumentParser(description='Batch process NASA HDF/HDF5 datasets')
    parser.add_argument('--folder', required=True, help='Folder containing HDF/HDF5 files')
    parser.add_argument('--out', required=True, help='Output folder for overlays')
    parser.add_argument('--product', choices=list(PRODUCT_PATTERNS.keys()), 
                       help='Process only specific product type (default: all)')
    parser.add_argument('--parallel', type=int, default=1, 
                       help='Number of parallel processes (default: 1)')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Show what would be processed without actually processing')
    args = parser.parse_args()
    
    # Get script path
    script_dir = Path(__file__).parent
    hdf_script = script_dir / 'hdf_to_overlay.py'
    
    if not hdf_script.exists():
        print(f"[!] Error: hdf_to_overlay.py not found at {hdf_script}")
        sys.exit(1)
    
    # Scan folder
    print(f"\n[*] Scanning folder: {args.folder}")
    files_by_product = scan_folder(args.folder, args.product)
    
    if not files_by_product:
        print("[!] No matching files found!")
        sys.exit(1)
    
    # Print summary
    total_files = sum(len(files) for files in files_by_product.values())
    print(f"\n[*] Found {total_files} files across {len(files_by_product)} product(s):")
    for product_key, files in files_by_product.items():
        config = files[0]['config']
        date_range = f"{files[0]['date']} to {files[-1]['date']}"
        print(f"  - {config['name']}: {len(files)} files ({date_range})")
    
    if args.dry_run:
        print("\n[*] Dry run - nothing processed")
        sys.exit(0)
    
    # Process files
    print(f"\n[*] Processing with {args.parallel} worker(s)...\n")
    
    all_tasks = []
    for product_key, files in files_by_product.items():
        all_tasks.extend(files)
    
    success_count = 0
    fail_count = 0
    
    if args.parallel > 1:
        # Parallel processing
        with ProcessPoolExecutor(max_workers=args.parallel) as executor:
            futures = {
                executor.submit(process_file, task, args.out, str(hdf_script)): task 
                for task in all_tasks
            }
            
            for i, future in enumerate(as_completed(futures), 1):
                task = futures[future]
                success, date, error = future.result()
                
                if success:
                    print(f"[{i}/{len(all_tasks)}] [OK] {task['config']['name']} - {date}")
                    success_count += 1
                else:
                    print(f"[{i}/{len(all_tasks)}] [FAIL] {task['config']['name']} - {date}")
                    if error:
                        print(f"    Error: {error[:100]}")
                    fail_count += 1
    else:
        # Sequential processing
        for i, task in enumerate(all_tasks, 1):
            success, date, error = process_file(task, args.out, str(hdf_script))
            
            if success:
                print(f"[{i}/{len(all_tasks)}] [OK] {task['config']['name']} - {date}")
                success_count += 1
            else:
                print(f"[{i}/{len(all_tasks)}] [FAIL] {task['config']['name']} - {date}")
                if error:
                    print(f"    Error: {error[:100]}")
                fail_count += 1
    
    # Update manifest
    print("\n[*] Updating manifest...")
    update_manifest(args.out, files_by_product)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"[+] Success: {success_count}")
    print(f"[-] Failed:  {fail_count}")
    print(f"{'='*60}\n")
    
    if fail_count > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()

