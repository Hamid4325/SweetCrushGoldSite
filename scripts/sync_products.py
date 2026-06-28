"""
Sweet Crush Gold — Product Data Sync Script

Reads the rate list Excel, image index, and category mapping,
then generates products.json and products-data.js.

Usage:
    python scripts/sync_products.py

    Optional flags:
    --dry-run   Print output without writing files
    --verbose   Show detailed match info
"""

import json
import os
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

import openpyxl

BASE_DIR = Path(__file__).resolve().parent.parent

EXCLUDED_PRODUCTS = {
    "Sorbon Mini Cone Totti Fruity",
}

EXCEL_PATH = BASE_DIR / "assets" / "Sweet_Crush_Gold_Rate_List.xlsx"
IMAGE_INDEX_PATH = BASE_DIR / "assets" / "product-image-index.json"
CATEGORIES_PATH = BASE_DIR / "assets" / "product-categories.json"
PRODUCTS_JSON_PATH = BASE_DIR / "products.json"
PRODUCTS_JS_PATH = BASE_DIR / "products-data.js"
PRODUCT_IMAGES_DIR = BASE_DIR / "assets" / "products"

DRY_RUN = "--dry-run" in sys.argv
VERBOSE = "--verbose" in sys.argv


def log(msg, level="INFO"):
    print(f"[{level}] {msg}")


def normalize(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def fuzzy_match(name, candidates, threshold=0.5):
    norm_name = normalize(name)
    best_score = 0
    best_match = None
    for candidate in candidates:
        score = SequenceMatcher(None, norm_name, normalize(candidate)).ratio()
        if score > best_score:
            best_score = score
            best_match = candidate
    return (best_match, best_score) if best_score >= threshold else (None, 0)


def load_json(path):
    if not path.exists():
        log(f"File not found: {path}", "WARN")
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def read_excel_products(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    products = []
    for row in ws.iter_rows(min_row=3, values_only=True):
        sr_no, name, packing, unit_price, retail_price, trade_price, *_ = (
            row + (None,) * 7
        )
        if sr_no is None or name is None:
            continue
        if not isinstance(sr_no, (int, float)):
            continue
        name = str(name).strip()
        if not name:
            continue
        try:
            unit_price = float(unit_price) if unit_price is not None else 0
            retail_price = float(retail_price) if retail_price is not None else 0
            trade_price = float(trade_price) if trade_price is not None else 0
        except (ValueError, TypeError):
            continue
        packing = str(packing).strip() if packing else ""
        products.append(
            {
                "name": name,
                "packing": packing,
                "unitPrice": unit_price,
                "retailPrice": retail_price,
                "tradePrice": trade_price,
            }
        )
    wb.close()
    return products


def get_image(product_name, image_index, available_images):
    if product_name in image_index:
        return image_index[product_name]
    match, score = fuzzy_match(product_name, image_index.values())
    if match and score >= 0.6:
        if VERBOSE:
            log(f"Fuzzy matched '{product_name}' -> '{match}' (score={score:.2f})", "FUZZY")
        return match
    match, score = fuzzy_match(product_name, available_images)
    if match and score >= 0.6:
        if VERBOSE:
            log(f"Fuzzy matched '{product_name}' -> image '{match}' (score={score:.2f})", "FUZZY")
        return match
    return ""


def get_category(product_name, categories):
    if product_name in categories:
        return categories[product_name]
    match, score = fuzzy_match(product_name, categories.keys())
    if match and score >= 0.7:
        if VERBOSE:
            log(f"Fuzzy matched category for '{product_name}' -> '{match}' ({categories[match]})", "FUZZY")
        return categories[match]
    return "Others"


def main():
    log(f"Excel: {EXCEL_PATH}")
    log(f"Image index: {IMAGE_INDEX_PATH}")
    log(f"Categories: {CATEGORIES_PATH}")

    if not EXCEL_PATH.exists():
        log(f"ERROR: Excel file not found at {EXCEL_PATH}", "ERROR")
        sys.exit(1)

    image_index = load_json(IMAGE_INDEX_PATH)
    categories = load_json(CATEGORIES_PATH)
    available_images = {
        f.name for f in PRODUCT_IMAGES_DIR.iterdir() if f.is_file()
    }

    excel_products = read_excel_products(EXCEL_PATH)
    log(f"Found {len(excel_products)} products in Excel")

    excluded_found = [ep for ep in excel_products if ep["name"] in EXCLUDED_PRODUCTS]
    excel_products = [ep for ep in excel_products if ep["name"] not in EXCLUDED_PRODUCTS]
    if excluded_found:
        log(f"Excluded {len(excluded_found)} product(s): {[ep['name'] for ep in excluded_found]}", "EXCLUDE")

    products = []
    warnings = []
    indexed_products = set()

    for i, ep in enumerate(excel_products, start=1):
        name = ep["name"]
        img = get_image(name, image_index, available_images)
        cat = get_category(name, categories)

        if not img:
            warnings.append(f"No image found for '{name}'")
        if name not in image_index and not img:
            warnings.append(f"Image index missing entry for '{name}'")
        if name not in categories:
            warnings.append(f"No category mapping for '{name}' (defaulted to '{cat}')")

        indexed_products.add(name)
        products.append(
            {
                "id": i,
                "name": name,
                "packing": ep["packing"],
                "unitPrice": ep["unitPrice"],
                "retailPrice": ep["retailPrice"],
                "tradePrice": ep["tradePrice"],
                "category": cat,
                "image": img,
            }
        )

    unused_images = available_images - {p["image"] for p in products if p["image"]}
    unused_index = set(image_index.keys()) - indexed_products
    unused_cats = set(categories.keys()) - indexed_products

    if unused_index:
        warnings.append(f"Products in image index but NOT in Excel: {', '.join(sorted(unused_index))}")
    if unused_cats:
        warnings.append(f"Products in categories file but NOT in Excel: {', '.join(sorted(unused_cats))}")
    if unused_images:
        warnings.append(f"Unused images in assets/products/ ({len(unused_images)}): {', '.join(sorted(unused_images)[:10])}{'...' if len(unused_images) > 10 else ''}")

    for w in warnings:
        log(w, "WARN")

    log(f"Generated {len(products)} product entries")
    log("\n--- Summary ---")
    log(f"Products with images: {sum(1 for p in products if p['image'])}/{len(products)}")
    log(f"Products with category: {sum(1 for p in products if p['category'] != 'Others')}/{len(products)}")
    log(f"Unused images in folder: {len(unused_images)}")

    json_output = json.dumps(products, indent=2, ensure_ascii=False)
    js_output = f"window.SWEET_CRUSH_PRODUCTS = {json.dumps(products, indent=2, ensure_ascii=False)};\n"

    if DRY_RUN:
        log("\n--- DRY RUN (no files written) ---", "DRY")
        print(json_output)
        return

    with open(PRODUCTS_JSON_PATH, "w", encoding="utf-8") as f:
        f.write(json_output)
    log(f"Wrote {PRODUCTS_JSON_PATH}")

    with open(PRODUCTS_JS_PATH, "w", encoding="utf-8") as f:
        f.write(js_output)
    log(f"Wrote {PRODUCTS_JS_PATH}")

    log("Done!")


if __name__ == "__main__":
    main()
