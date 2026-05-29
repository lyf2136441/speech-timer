"""Iron Scrap Detection Launcher - picks the best model and video."""
import subprocess
import sys
from pathlib import Path

BASE = Path(r"C:\Users\Lenovo\Desktop\小助手\金属屑识别")

# Find all mp4 videos
videos = sorted(BASE.glob("*.mp4"))
# Find available models
model_candidates = [
    BASE.parent / "runs" / "detect" / "iron_scrap_v2" / "weights" / "best.pt",
    Path(r"C:\Users\Lenovo\runs\detect\iron_scrap_v2\weights\best.pt"),
    Path(r"C:\Users\Lenovo\runs\detect\train-3\weights\best.pt"),
]
models = [m for m in model_candidates if m.exists()]

if not videos:
    print("No videos found! Place 4.mp4 or 5.mp4 in the folder.")
    sys.exit(1)
if not models:
    print("No models found! Run train_yolo.py first.")
    sys.exit(1)

print("=" * 55)
print("  IRON SCRAP DETECTION - Real-time Video Player")
print("=" * 55)

print("\nVideos:")
for i, v in enumerate(videos):
    size_mb = v.stat().st_size / (1024 * 1024)
    print(f"  [{i + 1}] {v.name} ({size_mb:.1f} MB)")

print("\nModels:")
for i, m in enumerate(models):
    print(f"  [{i + 1}] {m}")

# Auto-select
video_path = str(videos[0])
model_path = str(models[0])

if len(videos) > 1:
    choice = input(f"\nPick video [1-{len(videos)}] (default=1): ").strip()
    if choice and choice.isdigit():
        video_path = str(videos[int(choice) - 1])

if len(models) > 1:
    choice = input(f"Pick model [1-{len(models)}] (default=1): ").strip()
    if choice and choice.isdigit():
        model_path = str(models[int(choice) - 1])

conf = input("Confidence threshold [0.35] (higher = fewer but more precise): ").strip()
conf = float(conf) if conf else 0.35

print(f"\nStarting detection...")
print(f"  Video: {Path(video_path).name}")
print(f"  Model: {Path(model_path).name}")
print(f"  Conf:  {conf}")
print(f"\nControls:")
print(f"  SPACE  = Play/Pause")
print(f"  A/D    = Seek -/+ 5 seconds")
print(f"  N/M    = Previous/Next frame")
print(f"  +/-    = Adjust confidence threshold")
print(f"  S      = Save detection video")
print(f"  Q/ESC  = Quit")
print()

cmd = [
    sys.executable,
    str(BASE / "detect_video.py"),
    video_path,
    "--model", model_path,
    "--conf", str(conf),
]
subprocess.run(cmd)
