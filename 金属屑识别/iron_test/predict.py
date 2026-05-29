from ultralytics import YOLO
import shutil

# 加载模型
model = YOLO(r"C:\Users\Lenovo\runs\detect\train-3\weights\best.pt")

# 识别视频
results = model.predict(
    source=r"C:\Users\Lenovo\Desktop\4.mp4",
    save=True,
    conf=0.4,
    project=r"C:\Users\Lenovo\Desktop",
    name="temp_result"
)

# 改输出名字
shutil.move(
    r"C:\Users\Lenovo\Desktop\temp_result\5.mp4",
    r"C:\Users\Lenovo\Desktop\识别结果.mp4"
)

print("识别完成，视频已保存到桌面")