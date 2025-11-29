// 粒子数量
export const COUNT = 36000;

// 生成虫洞形状
function generateWormhole(count) {
    const positions = [];
    for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * Math.PI * 40;
        const z = (t - 0.5) * 3000;
        const radius = 200 + Math.pow(Math.abs(t - 0.5) * 2, 2) * 1000;
        positions.push(
            Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
            Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
            z
        );
    }
    return positions;
}

// 生成数据螺旋形状
function generateDataHelix(count) {
    const positions = [];
    for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * Math.PI * 30;
        const height = (t - 0.5) * 2500;
        const radius = 500;
        const strandOffset = (i % 2 === 0) ? 0 : Math.PI;
        const br = Math.random() > 0.95 ? 300 : 20;
        positions.push(
            Math.cos(angle + strandOffset) * radius + (Math.random() - 0.5) * br,
            height,
            Math.sin(angle + strandOffset) * radius + (Math.random() - 0.5) * br
        );
    }
    return positions;
}

// 生成赛博网格形状
function generateCyberGrid(count) {
    const positions = [];
    const gridSize = Math.sqrt(count);
    const spacing = 60;
    for (let i = 0; i < count; i++) {
        const ix = i % gridSize;
        const iz = Math.floor(i / gridSize);
        const x = (ix - gridSize / 2) * spacing;
        const z = (iz - gridSize / 2) * spacing;
        const y = Math.sin(x * 0.005) * Math.cos(z * 0.005) * 400 + (Math.random() - 0.5) * 50;
        positions.push(x, y, z);
    }
    return positions;
}

// 生成星门形状
function generateStargate(count) {
    const positions = [];
    for (let i = 0; i < count; i++) {
        const u = i / count * Math.PI * 2;
        const p = 3;
        const q = 7;
        const r = 700 + 180 * Math.cos(q * u);
        positions.push(
            r * Math.cos(p * u),
            r * Math.sin(p * u),
            180 * Math.sin(q * u) * 2.5 + (Math.random() - 0.5) * 100
        );
    }
    return positions;
}

// 生成星云结形状
function generateNebulaKnot(count) {
    const positions = [];
    for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 120;
        const scale = 600;
        positions.push(
            scale * (Math.cos(t) + Math.cos(3 * t)) * 0.5 + (Math.random() - 0.5) * 200,
            scale * (Math.sin(t) + Math.sin(3 * t)) * 0.5 + (Math.random() - 0.5) * 200,
            scale * Math.sin(4 * t) * 0.5 + (Math.random() - 0.5) * 300
        );
    }
    return positions;
}

// 生成莫比乌斯带形状
function generateMobiusStrip(count) {
    const positions = [];
    for (let i = 0; i < count; i++) {
        const u = (i / count) * Math.PI * 2;
        const w = (Math.random() - 0.5) * 300;
        const R = 600;
        positions.push(
            (R + w * Math.cos(u / 2)) * Math.cos(u),
            (R + w * Math.cos(u / 2)) * Math.sin(u),
            w * Math.sin(u / 2)
        );
    }
    return positions;
}

// 生成洛伦兹吸引子形状
function generateLorenzAttractor(count) {
    const positions = [];
    let lx = 0.1, ly = 0, lz = 0;
    const dt = 0.005;
    const sigma = 10, rho = 28, beta = 8 / 3;
    const scale = 25;
    for (let i = 0; i < count; i++) {
        const dx = sigma * (ly - lx) * dt;
        const dy = (lx * (rho - lz) - ly) * dt;
        const dz = (lx * ly - beta * lz) * dt;
        lx += dx;
        ly += dy;
        lz += dz;
        positions.push(lx * scale, ly * scale, (lz - 25) * scale);
    }
    return positions;
}

// 生成超级环形状
function generateHyperTorus(count) {
    const positions = [];
    for (let i = 0; i < count; i++) {
        const u = (i / count) * Math.PI * 4;
        const v = (i / count) * Math.PI * 20;
        const R = 600;
        const r1 = 200;
        const r2 = 100;
        const rDyn = r1 + r2 * Math.cos(v);
        positions.push(
            (R + rDyn * Math.cos(u)) * Math.cos(v * 0.1),
            (R + rDyn * Math.cos(u)) * Math.sin(v * 0.1),
            rDyn * Math.sin(u) + Math.sin(v) * 100
        );
    }
    return positions;
}

// 生成斐波那契球形状
function generateFibonacciSphere(count) {
    const positions = [];
    const phi = Math.PI * (3.0 - Math.sqrt(5.0)); // 黄金角
    for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const theta = phi * i;
        const R = 700;
        positions.push(
            Math.cos(theta) * radius * R,
            y * R,
            Math.sin(theta) * radius * R
        );
    }
    return positions;
}

// 生成所有形状
export function generateShapes(count = COUNT) {
    return {
        wormhole: generateWormhole(count),
        data_helix: generateDataHelix(count),
        cyber_grid: generateCyberGrid(count),
        stargate: generateStargate(count),
        nebula_knot: generateNebulaKnot(count),
        mobius_strip: generateMobiusStrip(count),
        lorenz_attractor: generateLorenzAttractor(count),
        hyper_torus: generateHyperTorus(count),
        fibonacci_sphere: generateFibonacciSphere(count)
    };
}

// 获取形状名称列表
export function getShapeNames(shapes) {
    return Object.keys(shapes);
}
