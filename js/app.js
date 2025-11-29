import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { generateShapes, getShapeNames, COUNT } from './shapes.js';
import { vertexShader, fragmentShader, createUniforms } from './shaders.js';
import { HandTracker } from './handTracking.js';
import { AudioAnalyzer } from './audioAnalyzer.js';

// ============================================
// 应用主类
// ============================================
class Y2KVisualizer {
    constructor() {
        // 核心组件
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.controls = null;
        this.bloomPass = null;

        // 粒子系统
        this.particles = null;
        this.geometry = null;
        this.uniforms = null;
        this.positions = null;
        this.targetPositions = null;

        // 形状系统
        this.shapes = null;
        this.shapeNames = [];
        this.currentShapeIndex = 0;

        // 功能模块
        this.handTracker = null;
        this.audioAnalyzer = null;

        // UI 元素
        this.fpsElement = null;
        this.modeDisplay = null;
        this.spectrumBars = {};

        // 性能追踪
        this.lastTime = 0;
    }

    // 初始化应用
    async init() {
        this.initScene();
        this.initParticles();
        this.initPostProcessing();
        this.initControls();
        this.initUI();
        await this.initModules();
        this.initEventListeners();
        this.animate(0);
    }

    // 初始化场景
    initScene() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.001);

        // 创建相机
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            1,
            10000
        );
        this.camera.position.set(0, 100, 900);

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    }

    // 初始化粒子系统
    initParticles() {
        // 生成形状数据
        this.shapes = generateShapes(COUNT);
        this.shapeNames = getShapeNames(this.shapes);

        // 创建几何体
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(COUNT * 3);
        this.targetPositions = new Float32Array(COUNT * 3);
        const colors = new Float32Array(COUNT * 3);
        const sizes = new Float32Array(COUNT);

        // 初始化数据
        const initialShape = this.shapes.wormhole;
        for (let i = 0; i < COUNT * 3; i++) {
            this.positions[i] = initialShape[i];
            this.targetPositions[i] = initialShape[i];
            colors[i] = Math.random();
        }
        for (let i = 0; i < COUNT; i++) {
            sizes[i] = Math.random();
        }

        // 设置属性
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('colorAttr', new THREE.BufferAttribute(colors, 1));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // 创建着色器材质
        this.uniforms = createUniforms();
        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        // 创建粒子系统
        this.particles = new THREE.Points(this.geometry, material);
        this.scene.add(this.particles);
    }

    // 初始化后处理
    initPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,
            0.4,
            0.85
        );
        this.bloomPass.threshold = 0;
        this.bloomPass.strength = 1.8;
        this.bloomPass.radius = 0.6;
        this.composer.addPass(this.bloomPass);
    }

    // 初始化控制器
    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.3;
    }

    // 初始化 UI
    initUI() {
        this.fpsElement = document.getElementById('fps');
        this.modeDisplay = document.getElementById('mode-display');

        this.spectrumBars = {
            low: document.getElementById('vis-low'),
            mid: document.getElementById('vis-mid'),
            high: document.getElementById('vis-high')
        };
    }

    // 初始化功能模块
    async initModules() {
        // 手势追踪
        const video = document.getElementById('webcam');
        const statusElement = document.getElementById('gesture-status');
        this.handTracker = new HandTracker(video, statusElement);
        await this.handTracker.init();

        // 音频分析
        this.audioAnalyzer = new AudioAnalyzer();
    }

    // 初始化事件监听
    initEventListeners() {
        // 滑块控制
        this.bindSlider('lowRange', 'v-low', (val) => this.uniforms.uLowAmp.value = val);
        this.bindSlider('midRange', 'v-mid', (val) => this.uniforms.uMidAmp.value = val);
        this.bindSlider('highRange', 'v-high', (val) => this.uniforms.uHighAmp.value = val);
        this.bindSlider('sizeRange', 'v-size', (val) => this.uniforms.uBaseSize.value = val);
        this.bindSlider('glowRange', 'v-glow', (val) => this.bloomPass.strength = val);

        // 音频文件输入
        document.getElementById('audioInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.audioAnalyzer.loadAudioFile(file).catch(console.error);
            }
        });

        // 键盘事件 - 切换形状
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.switchShape();
            }
        });

        // 窗口调整
        window.addEventListener('resize', () => this.onResize());
    }

    // 绑定滑块
    bindSlider(sliderId, displayId, callback) {
        const slider = document.getElementById(sliderId);
        const display = document.getElementById(displayId);
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            display.innerText = value.toFixed(1);
            callback(value);
        });
    }

    // 切换形状
    switchShape() {
        this.currentShapeIndex = (this.currentShapeIndex + 1) % this.shapeNames.length;
        const shapeName = this.shapeNames[this.currentShapeIndex];
        this.modeDisplay.innerText = shapeName.toUpperCase();

        const shapeData = this.shapes[shapeName];
        for (let i = 0; i < COUNT * 3; i++) {
            this.targetPositions[i] = shapeData[i];
        }
    }

    // 窗口调整处理
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    // 动画循环
    animate(time) {
        requestAnimationFrame((t) => this.animate(t));

        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;

        // 更新 FPS
        if (time % 500 < 20) {
            this.fpsElement.innerText = Math.round(1 / deltaTime);
        }

        // 更新音频分析
        const frequencies = this.audioAnalyzer.analyze();

        // 更新手势缩放
        const scale = this.handTracker.updateScale();

        // 更新 uniforms
        this.uniforms.uTime.value = time * 0.001;
        this.uniforms.uBass.value = frequencies.bass;
        this.uniforms.uMid.value = frequencies.mid;
        this.uniforms.uHigh.value = frequencies.high;
        this.uniforms.uHandScale.value = scale;

        // 更新频谱显示
        this.spectrumBars.low.style.height = (frequencies.bass * 100) + "%";
        this.spectrumBars.mid.style.height = (frequencies.mid * 100) + "%";
        this.spectrumBars.high.style.height = (frequencies.high * 100) + "%";

        // 平滑过渡粒子位置
        const pos = this.geometry.attributes.position.array;
        for (let i = 0; i < COUNT * 3; i++) {
            pos[i] += (this.targetPositions[i] - pos[i]) * 0.03;
        }
        this.geometry.attributes.position.needsUpdate = true;

        // 更新控制器和渲染
        this.controls.update();
        this.composer.render();
    }
}

// ============================================
// 启动应用
// ============================================
const app = new Y2KVisualizer();
app.init().catch(console.error);
