import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// 手势追踪管理器
export class HandTracker {
    constructor(videoElement) {
        this.video = videoElement;
        this.handLandmarker = null;
        this.lastVideoTime = -1;

        // 缩放控制
        this.targetScale = 1.0;
        this.currentScale = 1.0;

        // 手掌位置追踪（用于视角控制）
        this.palmPosition = { x: 0.5, y: 0.5 }; // 归一化坐标 (0-1)
        this.lastPalmPosition = { x: 0.5, y: 0.5 };
        this.palmVelocity = { x: 0, y: 0 }; // 手掌移动速度
        this.isHandDetected = false;
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

            // 启动摄像头
            await this.startCamera();
        } catch (error) {
            console.error("Hand tracking init failed:", error);
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
                this.isHandDetected = true;
                this.processHandLandmarks(result.landmarks[0]);
            } else {
                this.isHandDetected = false;
                this.targetScale = 1.0;
                // 手离开时速度衰减
                this.palmVelocity.x *= 0.9;
                this.palmVelocity.y *= 0.9;
            }
        }

        requestAnimationFrame(() => this.predictLoop());
    }

    // 处理手部关键点
    processHandLandmarks(landmarks) {
        const wrist = landmarks[0];
        const middleFingerBase = landmarks[9]; // 中指根部，更稳定的手掌中心参考
        const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];

        // 计算手掌中心位置（使用手腕和中指根部的平均值）
        const palmX = (wrist.x + middleFingerBase.x) / 2;
        const palmY = (wrist.y + middleFingerBase.y) / 2;

        // 保存上一帧位置
        this.lastPalmPosition.x = this.palmPosition.x;
        this.lastPalmPosition.y = this.palmPosition.y;

        // 更新当前位置（注意：x 需要镜像，因为摄像头是镜像的）
        this.palmPosition.x = 1 - palmX;
        this.palmPosition.y = palmY;

        // 计算移动速度（用于视角控制）
        this.palmVelocity.x = (this.palmPosition.x - this.lastPalmPosition.x) * 2;
        this.palmVelocity.y = (this.palmPosition.y - this.lastPalmPosition.y) * 2;

        // 计算指尖到手腕的平均距离（用于缩放控制）
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
        } else if (avgDistance > 0.35) {
            // 张开 - 扩张
            this.targetScale = 1.6;
        } else {
            // 正常
            this.targetScale = 1.0;
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

    // 获取手掌移动速度（用于控制视角）
    getPalmVelocity() {
        return this.palmVelocity;
    }

    // 获取手掌位置
    getPalmPosition() {
        return this.palmPosition;
    }

    // 检查手是否被检测到
    isTracking() {
        return this.isHandDetected;
    }
}
