import cv2
import numpy as np
from ultralytics import YOLO
import argparse
import sys
from pathlib import Path


class IronScrapDetector:
    def __init__(self, model_path, video_path, conf=0.35, iou=0.45):
        self.model = YOLO(model_path)
        self.video_path = Path(video_path)
        self.conf = conf
        self.iou = iou

        self.cap = cv2.VideoCapture(str(video_path))
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        self.paused = False
        self.current_frame = 0
        self.trackbar_name = "Frame"
        self.window_name = f"Iron Scrap Detection - {self.video_path.name}"

        self.box_color = (0, 255, 0)
        self.text_color = (255, 255, 255)
        self.bg_color = (0, 180, 0)

        self.frame_cache = {}
        self.model_img_size = 640

        print(f"Video: {self.video_path.name}")
        print(f"Frames: {self.total_frames}, FPS: {self.fps:.1f}")
        print(f"Resolution: {self.width}x{self.height}")
        print(f"Model: {model_path}")

    def detect_frame(self, frame):
        results = self.model(frame, conf=self.conf, iou=self.iou,
                             imgsz=self.model_img_size, verbose=False,
                             device=0)
        return results[0]

    def draw_boxes(self, frame, result):
        if result.boxes is None:
            return frame

        boxes = result.boxes.xyxy.cpu().numpy()
        confs = result.boxes.conf.cpu().numpy()

        # Filter: remove boxes touching edges (often false positives)
        h, w = frame.shape[:2]
        edge_margin = 3

        for box, conf in zip(boxes, confs):
            x1, y1, x2, y2 = map(int, box)
            conf_pct = conf * 100

            # Use color gradient: red (low conf) -> yellow -> green (high conf)
            if conf < 0.5:
                color = (0, int(255 * (conf / 0.5)), 255)
            elif conf < 0.7:
                color = (0, 255, int(255 * ((0.9 - conf) / 0.2)))
            else:
                color = (0, 255, 0)

            # Draw filled box with slight transparency
            overlay = frame.copy()
            cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
            frame = cv2.addWeighted(frame, 1, overlay, 0.15, 0)

            # Draw border
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

            # Draw label background
            label = f"iron {conf_pct:.1f}%"
            (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
            cv2.rectangle(frame, (x1, y1 - lh - 8), (x1 + lw + 6, y1), color, -1)
            cv2.putText(frame, label, (x1 + 3, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, self.text_color, 2)

        return frame

    def draw_hud(self, frame, detection_count, inference_time):
        h, w = frame.shape[:2]

        # Semi-transparent HUD panel
        hud = frame.copy()
        cv2.rectangle(hud, (10, 10), (280, 130), (0, 0, 0), -1)
        frame = cv2.addWeighted(frame, 1, hud, 0.5, 0)

        y = 35
        cv2.putText(frame, f"Detections: {detection_count}",
                    (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, self.box_color, 2)
        y += 28
        cv2.putText(frame, f"Frame: {self.current_frame}/{self.total_frames}",
                    (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, self.box_color, 2)
        y += 28
        cv2.putText(frame, f"Inference: {inference_time:.1f}ms",
                    (20, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, self.box_color, 2)
        y += 28
        status = "PAUSED" if self.paused else "PLAYING"
        status_color = (0, 200, 255) if self.paused else self.box_color
        cv2.putText(frame, status, (20, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)

        # Controls hint at bottom
        hint = "SPACE:Play/Pause  A/D:Seek 5s  N/M:Frame+/-  +/-:Conf  S:Save  Q:Quit"
        cv2.putText(frame, hint, (20, h - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)

        return frame

    def on_trackbar(self, pos):
        if pos != self.current_frame:
            self.current_frame = pos
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, pos)
            self.frame_cache.clear()

    def seek(self, delta_seconds):
        new_frame = self.current_frame + int(delta_seconds * self.fps)
        new_frame = max(0, min(new_frame, self.total_frames - 1))
        self.current_frame = new_frame
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, new_frame)
        cv2.setTrackbarPos(self.trackbar_name, self.window_name, new_frame)
        self.frame_cache.clear()

    def save_output(self, output_path=None):
        if output_path is None:
            output_path = self.video_path.stem + "_detected.mp4"

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(str(output_path), fourcc, self.fps,
                              (self.width, self.height))

        original_pos = self.current_frame
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

        print(f"\nSaving detection video to {output_path}...")
        for i in range(self.total_frames):
            ret, frame = self.cap.read()
            if not ret:
                break
            result = self.detect_frame(frame)
            frame = self.draw_boxes(frame, result)
            frame = self.draw_hud(frame, len(result.boxes) if result.boxes else 0, 0)
            out.write(frame)

            if i % 50 == 0:
                pct = (i / self.total_frames) * 100
                print(f"  Processing: {pct:.0f}%", end="\r")

        out.release()
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, original_pos)
        self.current_frame = original_pos
        print(f"\nSaved: {output_path}")

    def run(self):
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        cv2.createTrackbar(self.trackbar_name, self.window_name,
                           0, self.total_frames - 1, self.on_trackbar)

        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

        while True:
            if not self.paused:
                ret, frame = self.cap.read()
                if not ret:
                    self.current_frame = 0
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue

                self.current_frame = int(self.cap.get(cv2.CAP_PROP_POS_FRAMES))
                cv2.setTrackbarPos(self.trackbar_name, self.window_name,
                                   self.current_frame)

                # Run detection
                timer = cv2.getTickCount()
                result = self.detect_frame(frame)
                inference_time = (cv2.getTickCount() - timer) / cv2.getTickFrequency() * 1000

                count = len(result.boxes) if result.boxes else 0
                frame = self.draw_boxes(frame, result)
                frame = self.draw_hud(frame, count, inference_time)

                # Resize if too large for screen
                display = frame
                if self.width > 1400:
                    scale = 1400 / self.width
                    nh, nw = int(self.height * scale), 1400
                    display = cv2.resize(frame, (nw, nh))

                cv2.imshow(self.window_name, display)

            key = cv2.waitKey(1 if not self.paused else 0)

            if key == ord('q') or key == 27:
                break
            elif key == ord(' '):
                self.paused = not self.paused
            elif key == ord('s'):
                self.save_output()
            elif key == ord('n'):
                self.seek(1.0 / self.fps)
                self.paused = True
            elif key == ord('m'):
                self.seek(-1.0 / self.fps)
                self.paused = True
            elif key == ord('a') or key == 2424832:  # Left: a-key or arrow
                self.seek(-5)
            elif key == ord('d') or key == 2555904:  # Right: d-key or arrow
                self.seek(5)
            elif key == ord('+') or key == ord('='):
                self.conf = min(0.95, self.conf + 0.05)
                print(f"Confidence threshold: {self.conf:.2f}")
                self.frame_cache.clear()
            elif key == ord('-'):
                self.conf = max(0.05, self.conf - 0.05)
                print(f"Confidence threshold: {self.conf:.2f}")
                self.frame_cache.clear()

        self.cap.release()
        cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="Iron Scrap Real-time Detection")
    parser.add_argument("video", help="Path to video file (4.mp4 or 5.mp4)")
    parser.add_argument("--model", "-m",
                        default=r"C:\Users\Lenovo\runs\detect\iron_scrap_v2\weights\best.pt",
                        help="Path to YOLOv8 model weights")
    parser.add_argument("--conf", "-c", type=float, default=0.35,
                        help="Confidence threshold (default: 0.35)")
    parser.add_argument("--iou", type=float, default=0.45,
                        help="IoU threshold (default: 0.45)")

    args = parser.parse_args()

    # Auto-detect and validate model
    model_path = Path(args.model)
    if not model_path.exists():
        # Try fallback to older model
        fallback = Path(r"C:\Users\Lenovo\runs\detect\train-3\weights\best.pt")
        if fallback.exists():
            print(f"V2 model not found, using fallback: {fallback}")
            args.model = str(fallback)
        else:
            print(f"Model not found: {args.model}")
            print("Run train_yolo.py first to train a model.")
            sys.exit(1)
    else:
        print(f"Model: {args.model}")

    detector = IronScrapDetector(args.model, args.video, args.conf, args.iou)
    detector.run()


if __name__ == "__main__":
    main()
