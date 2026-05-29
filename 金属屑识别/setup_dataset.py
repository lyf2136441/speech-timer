import os
import random
import shutil
from pathlib import Path

random.seed(42)

base = Path(r"C:\Users\Lenovo\Desktop\小助手\金属屑识别")
src_images = base / "iron_dataset" / "images"
src_labels = base / "iron_dataset" / "labels"
dst = base / "yolo_dataset"

# Clean and recreate
if dst.exists():
    shutil.rmtree(dst)

for sub in ["train/images", "train/labels", "val/images", "val/labels"]:
    (dst / sub).mkdir(parents=True)

# Get all images that have labels
labeled = sorted([p.stem for p in src_labels.glob("*.txt")])
print(f"Total annotated images: {len(labeled)}")

# Shuffle and split
random.shuffle(labeled)
split = int(len(labeled) * 0.8)
train_ids = labeled[:split]
val_ids = labeled[split:]

print(f"Train: {len(train_ids)}, Val: {len(val_ids)}")

for ids, subset in [(train_ids, "train"), (val_ids, "val")]:
    for stem in ids:
        img_src = src_images / f"{stem}.jpg"
        lbl_src = src_labels / f"{stem}.txt"
        if img_src.exists():
            shutil.copy(img_src, dst / subset / "images" / f"{stem}.jpg")
            shutil.copy(lbl_src, dst / subset / "labels" / f"{stem}.txt")

# Write data.yaml
yaml_content = f"""path: {dst.as_posix()}
train: train/images
val: val/images

nc: 1
names:
  0: iron_scrap
"""
with open(dst / "data.yaml", "w", encoding="utf-8") as f:
    f.write(yaml_content)

print(f"\nDataset ready at {dst}")
print(f"data.yaml created.")
