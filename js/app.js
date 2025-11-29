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

        // 屏幕元素
        this.loadingScreen = null;
        this.startScreen = null;

        // 状态
        this.isStarted = false;
        this.lastTime = 0;
    }

    // 初始化应用
    async init() {
        // 获取屏幕元素
        this.loadingScreen = document.getElementById('loading-screen');
        this.startScreen = document.getElementById('start-screen');

        // 初始化场景（在后台）
        this.initScene();
        this.initParticles();
        this.initPostProcessing();
        this.initControls();

        // 开始加载资源
        await this.loadResources();
    }

    // 加载资源
    async loadResources() {
        const loadingBar = document.getElementById('loading-bar');
        const loadingStatus = document.getElementById('loading-status');
        const loadingPercent = document.getElementById('loading-percent');

        try {
            // 加载音频
            loadingStatus.textContent = 'LOADING AUDIO...';
            this.audioAnalyzer = new AudioAnalyzer();

            await this.audioAnalyzer.loadFromURL('./music.mp3', (progress) => {
                loadingBar.style.width = `${progress * 0.7}%`;
                loadingPercent.textContent = `${Math.round(progress * 0.7)}%`;
            });

            // 初始化手势追踪
            loadingStatus.textContent = 'INITIALIZING VISION SYSTEM...';
            loadingBar.style.width = '80%';
            loadingPercent.textContent = '80%';

            const video = document.getElementById('webcam');
            this.handTracker = new HandTracker(video);
            await this.handTracker.init();

            // 完成加载
            loadingBar.style.width = '100%';
            loadingPercent.textContent = '100%';
            loadingStatus.textContent = 'SYSTEM READY';

            // 短暂延迟后显示开始屏幕
            await this.delay(500);
            this.showStartScreen();

        } catch (error) {
            console.error('Loading failed:', error);
            loadingStatus.textContent = 'LOADING ERROR - PLEASE REFRESH';
        }
    }

    // 显示开始屏幕
    showStartScreen() {
        this.loadingScreen.classList.add('fade-out');

        setTimeout(() => {
            this.loadingScreen.classList.add('hidden');
            this.startScreen.classList.remove('hidden');

            // 绑定开始按钮
            document.getElementById('start-btn').addEventListener('click', () => {
                this.startExperience();
            });
        }, 500);
    }

    // 开始体验
    startExperience() {
        if (this.isStarted) return;
        this.isStarted = true;

        // 播放音频
        this.audioAnalyzer.play();

        // 淡出开始屏幕
        this.startScreen.classList.add('fade-out');

        setTimeout(() => {
            this.startScreen.classList.add('hidden');

            // 初始化事件监听
            this.initEventListeners();

            // 开始动画
            this.animate(0);
        }, 500);
    }

    // 延迟工具函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
        this.camera.position.set(0, 200, 1800);

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

        // 初始化数据（默认使用 fibonacci_sphere）
        const initialShape = this.shapes.fibonacci_sphere;
        this.currentShapeIndex = 1; // fibonacci_sphere 是第二个
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

    // 初始化事件监听
    initEventListeners() {
        // 键盘事件 - 切换形状
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.switchShape();
            }
        });

        // 窗口调整
        window.addEventListener('resize', () => this.onResize());
    }

    // 切换形状
    switchShape() {
        this.currentShapeIndex = (this.currentShapeIndex + 1) % this.shapeNames.length;
        const shapeName = this.shapeNames[this.currentShapeIndex];

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

        // 更新音频分析
        const frequencies = this.audioAnalyzer.analyze();

        // 更新手势缩放
        const scale = this.handTracker.updateScale();

        // 手掌位置控制自动旋转速度和方向
        if (this.handTracker.isTracking()) {
            const palm = this.handTracker.getPalmPosition();

            // 手掌位置映射到旋转速度
            // palm.x: 0=左边, 0.5=中间, 1=右边
            const offsetX = (palm.x - 0.5) * 2; // -1 到 1

            // 加大旋转速度，让效果更明显
            this.controls.autoRotateSpeed = offsetX * 8.0;
        } else {
            // 没有检测到手时恢复默认自动旋转
            this.controls.autoRotateSpeed = 0.3;
        }

        // 更新 uniforms
        this.uniforms.uTime.value = time * 0.001;
        this.uniforms.uBass.value = frequencies.bass;
        this.uniforms.uMid.value = frequencies.mid;
        this.uniforms.uHigh.value = frequencies.high;
        this.uniforms.uHandScale.value = scale;

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
