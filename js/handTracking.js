import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// 手势追踪管理器
export class HandTracker {
    constructor(videoElement, statusElement) {
        this.video = videoElement;
        this.statusElement = statusElement;
        this.handLandmarker = null;
        this.lastVideoTime = -1;
        this.targetScale = 1.0;
        this.currentScale = 1.0;
    }

    // 初始化视觉系统
    async init() {
        try {
            const resolver = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
            );

            this.handLandmarker = await HandLandmarker.createFromOptions(resolver, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numHands: 1
            });

            this.updateStatus(">> SYSTEM READY <<", "#00f3ff");

            // 启动摄像头
            await this.startCamera();
        } catch (error) {
            console.error("Hand tracking init failed:", error);
            this.updateStatus("VISION ERROR", "#ff0055");
        }
    }

    // 启动摄像头
    async startCamera() {
        if (navigator.mediaDevices?.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 320, height: 240 }
                });
                this.video.srcObject = stream;
                this.video.addEventListener("loadeddata", () => this.startPredictLoop());
            } catch (error) {
                console.error("Camera access failed:", error);
                this.updateStatus("CAMERA ERROR", "#ff0055");
            }
        }
    }

    // 开始预测循环
    startPredictLoop() {
        this.predictLoop();
    }

    // 预测循环
    predictLoop() {
        if (this.video.currentTime !== this.lastVideoTime && this.handLandmarker) {
            this.lastVideoTime = this.video.currentTime;

            const result = this.handLandmarker.detectForVideo(this.video, performance.now());

            if (result.landmarks.length > 0) {
                this.processHandLandmarks(result.landmarks[0]);
            } else {
                this.targetScale = 1.0;
                this.updateStatus("SCANNING SECTOR...", "#555");
            }
        }

        requestAnimationFrame(() => this.predictLoop());
    }

    // 处理手部关键点
    processHandLandmarks(landmarks) {
        const wrist = landmarks[0];
        const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];

        // 计算指尖到手腕的平均距离
        let totalDistance = 0;
        fingerTips.forEach(tip => {
            totalDistance += Math.sqrt(
                Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2)
            );
        });
        const avgDistance = totalDistance / 5;

        // 根据手势调整缩放
        if (avgDistance < 0.2) {
            // 握拳 - 收缩
            this.targetScale = 0.2;
            this.updateStatus("⚠ COLLAPSING UNIVERSE ⚠", "#ff0055");
        } else if (avgDistance > 0.35) {
            // 张开 - 扩张
            this.targetScale = 1.6;
            this.updateStatus(">> EXPANDING FIELD <<", "#00f3ff");
        } else {
            // 正常
            this.targetScale = 1.0;
            this.updateStatus("HAND DETECTED", "#fff");
        }
    }

    // 更新状态显示
    updateStatus(text, color) {
        if (this.statusElement) {
            this.statusElement.innerText = text;
            this.statusElement.style.color = color;
        }
    }

    // 更新缩放值（在动画循环中调用）
    updateScale() {
        this.currentScale += (this.targetScale - this.currentScale) * 0.05;
        return this.currentScale;
    }

    // 获取当前缩放值
    getScale() {
        return this.currentScale;
    }
}
