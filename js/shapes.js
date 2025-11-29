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
        fibonacci_sphere: generateFibonacciSphere(count)
    };
}

// 获取形状名称列表
export function getShapeNames(shapes) {
    return Object.keys(shapes);
}
