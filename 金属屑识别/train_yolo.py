from ultralytics import YOLO


def main():
    model = YOLO("yolov8n.pt")

    results = model.train(
        data=r"C:\Users\Lenovo\Desktop\小助手\金属屑识别\yolo_dataset\data.yaml",
        epochs=200,
        imgsz=640,
        batch=8,
        device=0,
        workers=0,  # Must be 0 on Windows to avoid multiprocessing issues
        patience=30,
        save=True,
        save_period=10,
        pretrained=True,

        # Augmentation for small dataset
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=10.0,
        translate=0.1,
        scale=0.5,
        shear=2.0,
        perspective=0.0,
        flipud=0.5,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.1,
        copy_paste=0.1,

        project=r"C:\Users\Lenovo\runs\detect",
        name="iron_scrap_v2",
        exist_ok=True,
    )

    print("\nTraining complete!")
    print(f"Best model: {results.save_dir}/weights/best.pt")


if __name__ == "__main__":
    main()
