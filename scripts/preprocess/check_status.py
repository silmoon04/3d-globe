#!/usr/bin/env python3
"""
Quick status checker for data processing pipeline.
Shows what's downloaded, what's processed, and what's ready.
"""
import os
import sys
import json
from pathlib import Path

def count_files(directory, extension):
    """Count files with extension in directory"""
    if not os.path.exists(directory):
        return 0
    return len(list(Path(directory).glob(f'*{extension}')))

def check_overlays(overlay_dir):
    """Check processed overlays"""
    if not os.path.exists(overlay_dir):
        return {}
    
    products = {}
    for product_folder in Path(overlay_dir).iterdir():
        if product_folder.is_dir() and product_folder.name != 'manifest.json':
            dates = [d.name for d in product_folder.iterdir() if d.is_dir()]
            products[product_folder.name] = sorted(dates)
    
    return products

def main():
    script_dir = Path(__file__).parent
    dataset_dir = script_dir.parent.parent / "datasets"
    overlay_dir = script_dir.parent.parent / "overlays"
    manifest_path = overlay_dir / "manifest.json"
    
    print("\n" + "="*60)
    print("DATA PROCESSING STATUS")
    print("="*60 + "\n")
    
    # Check downloaded files
    print("DOWNLOADED FILES (raw HDF/HDF5):")
    hdf_count = count_files(dataset_dir, '.hdf')
    h5_count = count_files(dataset_dir, '.h5')
    print(f"  HDF4 files (.hdf): {hdf_count}")
    print(f"  HDF5 files (.h5):  {h5_count}")
    print(f"  Total:             {hdf_count + h5_count}")
    
    if hdf_count + h5_count == 0:
        print(f"\n  [!] No files found in {dataset_dir}")
        print(f"      Download HDF files there first!\n")
        return
    
    print()
    
    # Check processed overlays
    print("PROCESSED OVERLAYS:")
    products = check_overlays(overlay_dir)
    
    if not products:
        print("  [!] No overlays processed yet")
        print("      Run batch_process.py to create overlays\n")
        return
    
    total_overlays = 0
    for product_id, dates in products.items():
        print(f"  {product_id}: {len(dates)} dates")
        total_overlays += len(dates)
        if len(dates) <= 5:
            for date in dates:
                print(f"    - {date}")
        else:
            print(f"    - {dates[0]} to {dates[-1]}")
    
    print(f"  Total overlays: {total_overlays}")
    print()
    
    # Check manifest
    print("MANIFEST:")
    if manifest_path.exists():
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        print(f"  [+] manifest.json exists")
        print(f"  Products: {len(manifest.get('overlays', []))}")
        
        for overlay in manifest.get('overlays', []):
            print(f"    - {overlay['name']}: {len(overlay.get('dates', []))} dates")
    else:
        print(f"  [!] manifest.json not found")
        print(f"      Will be created when you run batch_process.py")
    
    print()
    
    # Summary
    print("="*60)
    print("SUMMARY")
    print("="*60)
    
    if hdf_count + h5_count > 0 and total_overlays == 0:
        print("\n[+] Status: Downloaded, NOT processed")
        print("\nNext step:")
        print("   cd scripts/preprocess")
        print("   conda activate nasa")
        print("   python batch_process.py --folder ../../datasets --out ../../overlays --parallel 4\n")
    
    elif total_overlays > 0 and total_overlays < hdf_count + h5_count:
        print(f"\n[~] Status: Partially processed ({total_overlays}/{hdf_count + h5_count})")
        print("\nNext step:")
        print("   Continue processing remaining files:")
        print("   python batch_process.py --folder ../../datasets --out ../../overlays --parallel 4\n")
    
    elif total_overlays >= hdf_count + h5_count:
        print("\n[+] Status: ALL PROCESSED!")
        print("\nNext step:")
        print("   1. Start server: python -m http.server 8080")
        print("   2. Open browser: http://localhost:8080")
        print("   3. Enjoy the timelapse!\n")
    
    else:
        print("\n[!] Status: Unknown")

if __name__ == "__main__":
    main()

