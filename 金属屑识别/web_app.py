"""
Iron Scrap Detection - Web Application
Flask + YOLOv8 + MJPEG Streaming
Single-file, self-contained web app.
"""
import cv2
import numpy as np
import threading
import time
import json
import sys
from pathlib import Path
from flask import Flask, Response, request, jsonify, render_template_string

from ultralytics import YOLO

# ── Config ──────────────────────────────────────────────
BASE_DIR = Path(r"C:\Users\Lenovo\Desktop\小助手\金属屑识别")
MODEL_CANDIDATES = [
    Path(r"C:\Users\Lenovo\runs\detect\iron_scrap_v2\weights\best.pt"),
    Path(r"C:\Users\Lenovo\runs\detect\train-3\weights\best.pt"),
]

# ── State ───────────────────────────────────────────────
class AppState:
    def __init__(self):
        self.lock = threading.Lock()
        self.cap = None
        self.video_path = None
        self.total_frames = 0
        self.fps = 30.0
        self.width = 960
        self.height = 544
        self.current_frame = 0
        self.playing = True
        self.conf = 0.35
        self.iou = 0.45
        self.latest_frame = None  # RGB numpy array
        self.latest_boxes = []
        self.latest_confs = []
        self.inference_ms = 0
        self.detection_count = 0
        self.frame_ready = threading.Event()
        self.stop_stream = False

state = AppState()

# ── Load Model ─────────────────────────────────────────
model_path = None
for m in MODEL_CANDIDATES:
    if m.exists():
        model_path = str(m)
        break
if not model_path:
    print("ERROR: No YOLO model found!")
    sys.exit(1)

print(f"Loading model: {model_path}")
model = YOLO(model_path)
print("Model loaded.")

# ── Helpers ────────────────────────────────────────────
BOX_COLORS = [(0, 255, 0), (0, 200, 55), (0, 140, 115), (0, 100, 155), (0, 50, 200)]

def get_color(conf):
    """Green (high conf) -> Yellow -> Orange -> Red (low conf)."""
    idx = min(int((1 - conf) * len(BOX_COLORS)), len(BOX_COLORS) - 1)
    return BOX_COLORS[idx]

def draw_boxes_on_frame(frame, boxes, confs):
    for box, conf in zip(boxes, confs):
        x1, y1, x2, y2 = map(int, box)
        color = get_color(conf)
        label = f"iron {conf * 100:.0f}%"

        # Semi-transparent fill
        overlay = frame.copy()
        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
        frame = cv2.addWeighted(frame, 1, overlay, 0.18, 0)

        # Border
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

        # Label background + text
        (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 2)
        cv2.rectangle(frame, (x1, y1 - lh - 8), (x1 + lw + 6, y1), color, -1)
        cv2.putText(frame, label, (x1 + 3, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 2)
    return frame

def draw_hud(frame, inference_ms):
    h, w = frame.shape[:2]
    # Top-left panel
    overlay = frame.copy()
    cv2.rectangle(overlay, (8, 8), (260, 105), (15, 15, 15), -1)
    frame = cv2.addWeighted(frame, 1, overlay, 0.55, 0)

    color = (0, 220, 0)
    y = 32
    cv2.putText(frame, f"Detections: {state.detection_count}",
                (18, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
    y += 24
    cv2.putText(frame, f"Frame: {state.current_frame}/{state.total_frames}",
                (18, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
    y += 24
    cv2.putText(frame, f"Conf: {state.conf:.2f} | {inference_ms:.0f}ms",
                (18, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
    y += 24
    status = "PAUSED" if not state.playing else "LIVE"
    sc = (0, 180, 255) if not state.playing else color
    cv2.putText(frame, status, (18, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, sc, 2)

    return frame


def ensure_video_open(video_path):
    """Open video if needed. Returns True on success."""
    if state.cap is not None and state.video_path == video_path:
        return True

    p = Path(video_path)
    if not p.exists():
        return False

    with state.lock:
        if state.cap is not None:
            state.cap.release()
        state.cap = cv2.VideoCapture(str(p))
        state.video_path = str(p)
        state.total_frames = int(state.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        state.fps = state.cap.get(cv2.CAP_PROP_FPS)
        if state.fps <= 0:
            state.fps = 30.0
        state.width = int(state.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        state.height = int(state.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        state.current_frame = 0
        state.playing = True
    return True


def process_next_frame():
    """Read, detect, draw, and store the next frame. Called by stream loop."""
    with state.lock:
        if state.cap is None or not state.playing:
            return False
        if state.current_frame >= state.total_frames:
            state.current_frame = 0
            state.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        ret, frame_bgr = state.cap.read()
        if not ret:
            state.current_frame = 0
            state.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            return False
        state.current_frame = int(state.cap.get(cv2.CAP_PROP_POS_FRAMES))
        conf = state.conf
        iou = state.iou

    # Detection (outside lock for performance)
    t0 = time.perf_counter()
    results = model(frame_bgr, conf=conf, iou=iou, imgsz=640, verbose=False, device=0)
    t1 = time.perf_counter()
    ms = (t1 - t0) * 1000

    result = results[0]
    if result.boxes is not None:
        boxes_xyxy = result.boxes.xyxy.cpu().numpy()
        confs = result.boxes.conf.cpu().numpy()
    else:
        boxes_xyxy = []
        confs = []

    # Draw
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    frame_rgb = draw_boxes_on_frame(frame_rgb, boxes_xyxy, confs)
    frame_rgb = draw_hud(frame_rgb, ms)

    with state.lock:
        state.latest_frame = frame_rgb
        state.latest_boxes = boxes_xyxy
        state.latest_confs = confs
        state.inference_ms = ms
        state.detection_count = len(boxes_xyxy)
        state.frame_ready.set()

    return True


# ── Flask App ──────────────────────────────────────────
app = Flask(__name__)

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Iron Scrap Detection</title>
<style>
  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --border: #2a2d3a;
    --text: #e0e0e0;
    --accent: #00c853;
    --accent2: #2196f3;
    --danger: #ff5252;
    --warn: #ffab00;
    --radius: 10px;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: var(--text);
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    padding: 16px;
  }
  .container { width: 100%; max-width: 1200px; }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }
  .header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--accent), #69f0ae);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .header .badge {
    font-size: 0.75rem;
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 5px 12px;
    border-radius: 20px;
  }

  /* Video area */
  .video-wrapper {
    position: relative;
    background: #000;
    border-radius: var(--radius);
    overflow: hidden;
    border: 2px solid var(--border);
    margin-bottom: 14px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
  }
  .video-wrapper img {
    width: 100%;
    display: block;
  }
  .video-wrapper .placeholder {
    color: #555;
    font-size: 1.1rem;
    padding: 60px;
    text-align: center;
  }

  /* Controls bar */
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 16px;
    margin-bottom: 14px;
  }
  button, .btn {
    font-family: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    border: none;
    border-radius: 7px;
    padding: 9px 18px;
    cursor: pointer;
    transition: all 0.15s;
    color: #fff;
    white-space: nowrap;
  }
  button:active { transform: scale(0.96); }
  .btn-play  { background: var(--accent); min-width: 80px; }
  .btn-pause { background: var(--warn); color: #000; }
  .btn-stop  { background: var(--danger); }
  .btn-seek  { background: var(--accent2); }
  .btn-save  { background: #7c4dff; }
  .btn-outline {
    background: transparent;
    border: 1.5px solid var(--border);
    color: var(--text);
  }
  button:hover { filter: brightness(1.15); }

  select {
    font-family: inherit;
    font-size: 0.88rem;
    padding: 9px 14px;
    border-radius: 7px;
    background: var(--bg);
    color: var(--text);
    border: 1.5px solid var(--border);
    cursor: pointer;
    min-width: 150px;
  }
  label { font-size: 0.8rem; color: #999; margin-right: 4px; }
  input[type="range"] {
    accent-color: var(--accent);
    width: 100px;
  }
  .conf-display {
    display: inline-block;
    width: 38px;
    text-align: center;
    font-weight: 700;
    color: var(--accent);
  }

  /* Stats row */
  .stats {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 20px;
    flex: 1;
    min-width: 120px;
    text-align: center;
  }
  .stat-card .val { font-size: 1.5rem; font-weight: 700; color: var(--accent); }
  .stat-card .lbl { font-size: 0.75rem; color: #888; margin-top: 2px; }

  .footer {
    font-size: 0.7rem;
    color: #555;
    text-align: center;
    margin-top: 10px;
  }

  .sep { flex: 1; }
  .gap { width: 8px; }
</style>
</head>
<body>
<div class="container">

  <div class="header">
    <h1>Iron Scrap Detection</h1>
    <span class="badge">YOLOv8 + Flask MJPEG</span>
  </div>

  <!-- Video Feed -->
  <div class="video-wrapper">
    <img id="feed" src="/video_feed" alt="Detection Stream"
         onerror="this.style.display='none'; document.getElementById('nofeed').style.display='block'">
    <div id="nofeed" class="placeholder" style="display:none">
      No video stream. Select a video below and press Play.
    </div>
  </div>

  <!-- Controls -->
  <div class="controls">
    <button class="btn-play" id="btnPlay" onclick="api('play')">▶ Play</button>
    <button class="btn-pause" onclick="api('pause')">⏸ Pause</button>
    <button class="btn-stop" onclick="api('stop')">⏹ Stop</button>
    <span class="gap"></span>
    <button class="btn-seek" onclick="api('seek', {delta: -5})">⏪ -5s</button>
    <button class="btn-seek" onclick="api('seek', {delta: -1})">◀ -1s</button>
    <button class="btn-seek" onclick="api('seek', {delta: 1})">▶ +1s</button>
    <button class="btn-seek" onclick="api('seek', {delta: 5})">⏩ +5s</button>
    <span class="sep"></span>

    <label for="selVideo">Video:</label>
    <select id="selVideo" onchange="api('set_video', {video: this.value})">
      {% for v in videos %}
      <option value="{{ v.name }}" {% if v.selected %}selected{% endif %}>{{ v.name }}</option>
      {% endfor %}
    </select>
    <span class="gap"></span>

    <label for="confSlider">Conf:</label>
    <input type="range" id="confSlider" min="10" max="95" value="35" step="5"
           oninput="onConfChange(this.value)">
    <span class="conf-display" id="confVal">0.35</span>
    <span class="gap"></span>

    <button class="btn-save" onclick="api('save_video')">💾 Save</button>
    <div class="sep"></div>
    <button class="btn-outline" onclick="toggleFullscreen()">⛶ Fullscreen</button>
  </div>

  <!-- Stats -->
  <div class="stats">
    <div class="stat-card"><div class="val" id="statDetections">0</div><div class="lbl">Detections</div></div>
    <div class="stat-card"><div class="val" id="statFrame">0 / 0</div><div class="lbl">Frame</div></div>
    <div class="stat-card"><div class="val" id="statMs">0 ms</div><div class="lbl">Inference</div></div>
    <div class="stat-card"><div class="val" id="statConf">0.35</div><div class="lbl">Confidence</div></div>
    <div class="stat-card"><div class="val" id="statStatus">—</div><div class="lbl">Status</div></div>
  </div>

  <div class="footer">Stream auto-updates. Click buttons to control playback.</div>
</div>

<script>
  const STATS_URL = '/api/status';

  async function api(action, params = {}) {
    try {
      const body = JSON.stringify({ action, ...params });
      const r = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      const data = await r.json();
      if (data.status === 'ok') updateUI(data);
    } catch (e) {
      console.error('API error:', e);
    }
  }

  function onConfChange(val) {
    const c = parseInt(val) / 100;
    document.getElementById('confVal').textContent = c.toFixed(2);
    api('set_conf', { conf: c });
  }

  function updateUI(data) {
    if (data.detection_count !== undefined) {
      document.getElementById('statDetections').textContent = data.detection_count;
    }
    if (data.current_frame !== undefined && data.total_frames !== undefined) {
      document.getElementById('statFrame').textContent =
        `${data.current_frame} / ${data.total_frames}`;
    }
    if (data.inference_ms !== undefined) {
      document.getElementById('statMs').textContent =
        data.inference_ms.toFixed(1) + ' ms';
    }
    if (data.conf !== undefined) {
      document.getElementById('statConf').textContent = data.conf.toFixed(2);
    }
    if (data.playing !== undefined) {
      document.getElementById('statStatus').textContent =
        data.playing ? '▶ LIVE' : '⏸ PAUSED';
      document.getElementById('statStatus').style.color =
        data.playing ? 'var(--accent)' : 'var(--warn)';
    }
  }

  // Poll status every 500ms
  setInterval(async () => {
    try {
      const r = await fetch(STATS_URL);
      const data = await r.json();
      updateUI(data);
    } catch (e) {}
  }, 500);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    switch(e.key) {
      case ' ': e.preventDefault(); api('play_pause'); break;
      case 'ArrowLeft': e.preventDefault(); api('seek', {delta: -5}); break;
      case 'ArrowRight': e.preventDefault(); api('seek', {delta: 5}); break;
      case 'ArrowUp': e.preventDefault(); {
        const s = document.getElementById('confSlider');
        s.value = Math.min(95, parseInt(s.value) + 5);
        onConfChange(s.value);
        break;
      }
      case 'ArrowDown': e.preventDefault(); {
        const s = document.getElementById('confSlider');
        s.value = Math.max(10, parseInt(s.value) - 5);
        onConfChange(s.value);
        break;
      }
    }
  });

  function toggleFullscreen() {
    const el = document.querySelector('.video-wrapper');
    if (!document.fullscreenElement) {
      el.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
</script>
</body>
</html>"""


@app.route("/")
def index():
    videos = sorted(BASE_DIR.glob("*.mp4"))
    video_list = []
    for i, v in enumerate(videos):
        video_list.append({
            "name": v.name,
            "path": str(v),
            "selected": (state.video_path is not None and Path(state.video_path).name == v.name)
                     or (state.video_path is None and i == 0)
        })
    if not video_list:
        video_list.append({"name": "No videos found", "path": "", "selected": False})
    return render_template_string(HTML_TEMPLATE, videos=video_list)


def generate_frames():
    """MJPEG stream generator."""
    while not state.stop_stream:
        if state.playing:
            process_next_frame()

        frame = None
        for _ in range(50):  # Wait up to ~0.5s
            if state.frame_ready.wait(0.01):
                with state.lock:
                    frame = state.latest_frame
                state.frame_ready.clear()
                break
            if state.stop_stream:
                break

        if frame is None:
            # Create blank frame
            frame = np.zeros((state.height or 544, state.width or 960, 3), dtype=np.uint8)
            frame = cv2.putText(frame, "Loading...", (300, 280),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (150, 150, 150), 2)

        # Encode as JPEG
        ret, jpeg = cv2.imencode('.jpg', cv2.cvtColor(frame, cv2.COLOR_RGB2BGR),
                                 [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ret:
            continue

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' +
               jpeg.tobytes() + b'\r\n')


@app.route("/video_feed")
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route("/api/control", methods=["POST"])
def api_control():
    data = request.get_json(force=True)
    action = data.get("action", "")

    if action == "play":
        with state.lock:
            state.playing = True
    elif action == "pause":
        with state.lock:
            state.playing = False
    elif action == "play_pause":
        with state.lock:
            state.playing = not state.playing
    elif action == "stop":
        with state.lock:
            state.playing = False
            if state.cap:
                state.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            state.current_frame = 0
    elif action == "seek":
        delta = float(data.get("delta", 0))
        with state.lock:
            if state.cap:
                new_pos = state.current_frame + int(delta * state.fps)
                new_pos = max(0, min(new_pos, state.total_frames - 1))
                state.current_frame = new_pos
                state.cap.set(cv2.CAP_PROP_POS_FRAMES, new_pos)
                state.frame_ready.clear()
    elif action == "set_video":
        video = data.get("video", "")
        # Resolve filename to full path
        video_path = BASE_DIR / video
        if not video_path.exists():
            # Try as full path
            video_path = Path(video)
        if video_path.exists():
            ensure_video_open(str(video_path))
    elif action == "set_conf":
        with state.lock:
            state.conf = float(data.get("conf", 0.35))
    elif action == "save_video":
        return jsonify({"status": "ok", "message": save_video_background()})

    return jsonify(get_status())


@app.route("/api/status")
def api_status():
    return jsonify(get_status())


def get_status():
    return {
        "status": "ok",
        "playing": state.playing,
        "current_frame": state.current_frame,
        "total_frames": state.total_frames,
        "fps": state.fps,
        "conf": state.conf,
        "detection_count": state.detection_count,
        "inference_ms": state.inference_ms,
        "video_name": Path(state.video_path).name if state.video_path else "",
    }


def save_video_background():
    """Save processed video in background thread."""
    video_path = state.video_path
    if not video_path:
        return "No video loaded"

    output = BASE_DIR / (Path(video_path).stem + "_detected.mp4")

    def _save():
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(str(output), fourcc, fps, (w, h))

        for i in range(total):
            ret, frame = cap.read()
            if not ret:
                break
            results = model(frame, conf=state.conf, iou=state.iou,
                           imgsz=640, verbose=False, device=0)
            result = results[0]
            if result.boxes is not None:
                boxes = result.boxes.xyxy.cpu().numpy()
                confs = result.boxes.conf.cpu().numpy()
            else:
                boxes, confs = [], []
            frame = draw_boxes_on_frame(frame, boxes, confs)
            out.write(frame)
            if i % 50 == 0:
                print(f"  Saving: {i / total * 100:.0f}%", end="\r")

        cap.release()
        out.release()
        print(f"\nSaved: {output}")

    t = threading.Thread(target=_save, daemon=True)
    t.start()
    return f"Saving to {output.name}..."


def find_videos():
    return sorted(BASE_DIR.glob("*.mp4"))


def main():
    videos = find_videos()
    if not videos:
        print("ERROR: No MP4 videos found!")
        sys.exit(1)

    # Open first video by default
    ensure_video_open(str(videos[0]))

    print(f"\n{'='*55}")
    print(f"  Iron Scrap Detection - Web App")
    print(f"  Open in browser: http://127.0.0.1:5000")
    print(f"  Video: {videos[0].name}")
    print(f"  Model: {Path(model_path).name}")
    print(f"{'='*55}\n")

    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)


if __name__ == "__main__":
    main()
