// 音频分析器
export class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.source = null;

        // 平滑后的频率值
        this.smoothBass = 0;
        this.smoothMid = 0;
        this.smoothHigh = 0;

        // 加载进度
        this.loadProgress = 0;
        this.isLoaded = false;
    }

    // 从 URL 加载音频（支持进度回调）
    async loadFromURL(url, onProgress) {
        try {
            // 使用 fetch 获取音频并追踪进度
            const response = await fetch(url);
            const contentLength = response.headers.get('content-length');
            const total = parseInt(contentLength, 10);
            let loaded = 0;

            const reader = response.body.getReader();
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                loaded += value.length;

                this.loadProgress = total ? (loaded / total) * 100 : 50;
                if (onProgress) onProgress(this.loadProgress);
            }

            // 合并所有块
            const audioData = new Uint8Array(loaded);
            let position = 0;
            for (const chunk of chunks) {
                audioData.set(chunk, position);
                position += chunk.length;
            }

            // 创建音频上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await this.audioContext.decodeAudioData(audioData.buffer);

            // 创建音频源
            this.source = this.audioContext.createBufferSource();
            this.source.buffer = audioBuffer;
            this.source.loop = true; // 循环播放

            // 创建分析器
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;

            // 连接节点
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            // 创建数据数组
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            this.isLoaded = true;
            this.loadProgress = 100;

            return true;
        } catch (error) {
            console.error('Audio load error:', error);
            throw error;
        }
    }

    // 开始播放
    play() {
        if (this.source && this.audioContext) {
            // 恢复音频上下文（处理浏览器自动播放策略）
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            this.source.start(0);
        }
    }

    // 分析频率数据
    analyze() {
        let rawBass = 0, rawMid = 0, rawHigh = 0;

        if (this.analyser && this.dataArray) {
            this.analyser.getByteFrequencyData(this.dataArray);
            const len = this.dataArray.length;

            // 计算低频 (Bass) - 前2%
            const bassEnd = Math.floor(len * 0.02);
            let bassSum = 0;
            for (let i = 0; i < bassEnd; i++) {
                bassSum += this.dataArray[i];
            }
            rawBass = (bassSum / bassEnd) / 255;

            // 计算中频 (Mid) - 2% ~ 30%
            const midEnd = Math.floor(len * 0.3);
            let midSum = 0;
            for (let i = bassEnd; i < midEnd; i++) {
                midSum += this.dataArray[i];
            }
            rawMid = (midSum / (midEnd - bassEnd)) / 255;

            // 计算高频 (High) - 30% ~ 100%
            let highSum = 0;
            for (let i = midEnd; i < len; i++) {
                highSum += this.dataArray[i];
            }
            rawHigh = (highSum / (len - midEnd)) / 255;
        }

        // 增强高频
        rawHigh = Math.min(rawHigh * 1.8, 1.0);

        // 应用阈值
        if (rawBass < 0.25) rawBass = 0;
        if (rawMid < 0.2) rawMid = 0;
        if (rawHigh < 0.05) rawHigh = 0;

        // 平滑处理
        if (rawBass > this.smoothBass) {
            this.smoothBass += (rawBass - this.smoothBass) * 0.6;
        } else {
            this.smoothBass += (rawBass - this.smoothBass) * 0.15;
        }
        this.smoothMid += (rawMid - this.smoothMid) * 0.2;
        this.smoothHigh += (rawHigh - this.smoothHigh) * 0.4;

        return {
            bass: this.smoothBass,
            mid: this.smoothMid,
            high: this.smoothHigh
        };
    }

    // 获取当前频率值
    getFrequencies() {
        return {
            bass: this.smoothBass,
            mid: this.smoothMid,
            high: this.smoothHigh
        };
    }

    // 检查是否已初始化
    isReady() {
        return this.analyser !== null;
    }

    // 获取加载进度
    getLoadProgress() {
        return this.loadProgress;
    }
}
