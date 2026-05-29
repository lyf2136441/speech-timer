import json
import os
from pathlib import Path

# Convert LabelMe JSON annotations to YOLO format
# YOLO format: class x_center y_center width height (all normalized 0-1)

dataset_dir = Path(r"C:\Users\Lenovo\Desktop\小助手\金属屑识别\iron_dataset\images")
output_dir = Path(r"C:\Users\Lenovo\Desktop\小助手\金属屑识别\iron_dataset\labels")
output_dir.mkdir(exist_ok=True)

json_files = sorted(dataset_dir.glob("*.json"))

for json_path in json_files:
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    img_w = data["imageWidth"]
    img_h = data["imageHeight"]
    shapes = data["shapes"]

    yolo_lines = []
    for shape in shapes:
        if shape["shape_type"] != "rectangle":
            continue

        pts = shape["points"]
        x1, y1 = pts[0]
        x2, y2 = pts[1]

        # Ensure x1 < x2, y1 < y2
        if x1 > x2:
            x1, x2 = x2, x1
        if y1 > y2:
            y1, y2 = y2, y1

        # YOLO format: normalized center + normalized size
        w = x2 - x1
        h = y2 - y1
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0

        cx_norm = cx / img_w
        cy_norm = cy / img_h
        w_norm = w / img_w
        h_norm = h / img_h

        yolo_lines.append(f"0 {cx_norm:.16f} {cy_norm:.16f} {w_norm:.16f} {h_norm:.16f}")

    # Write YOLO label file
    label_path = output_dir / (json_path.stem + ".txt")
    with open(label_path, "w", encoding="utf-8") as f:
        f.write("\n".join(yolo_lines))

    print(f"[OK] {json_path.name} -> {len(yolo_lines)} boxes -> {label_path.name}")

print(f"\nDone! Converted {len(json_files)} annotation files.")
