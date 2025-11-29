// 音频分析器
export class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;

        // 平滑后的频率值
        this.smoothBass = 0;
        this.smoothMid = 0;
        this.smoothHigh = 0;
    }

    // 加载音频文件
    loadAudioFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error("No file provided"));
                return;
            }

            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const audioBuffer = await this.audioContext.decodeAudioData(event.target.result);

                    // 创建音频源
                    const source = this.audioContext.createBufferSource();
                    source.buffer = audioBuffer;

                    // 创建分析器
                    this.analyser = this.audioContext.createAnalyser();
                    this.analyser.fftSize = 2048;
                    this.analyser.smoothingTimeConstant = 0.8;

                    // 连接节点
                    source.connect(this.analyser);
                    this.analyser.connect(this.audioContext.destination);

                    // 创建数据数组
                    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

                    // 开始播放
                    source.start(0);

                    resolve();
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error("File read error"));
            reader.readAsArrayBuffer(file);
        });
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
}
