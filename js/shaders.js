// 顶点着色器
export const vertexShader = `
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform float uLowAmp;
    uniform float uMidAmp;
    uniform float uHighAmp;
    uniform float uHandScale;
    uniform float uBaseSize;

    attribute float size;
    attribute float colorAttr;

    varying float vType;
    varying float vIntensity;

    void main() {
        vType = colorAttr;
        vec3 pos = position;

        float isBass = 1.0 - step(0.33, colorAttr);
        float isHigh = step(0.66, colorAttr);
        float isMid = 1.0 - isBass - isHigh;

        vec3 dir = normalize(pos);

        // 1. Bass - 低频膨胀
        vec3 moveBass = dir * uBass * 80.0 * uLowAmp;

        // 2. Mid - 中频旋转 (Vortex)
        float swirlAngle = uMid * uMidAmp * 0.5;
        float s = sin(swirlAngle);
        float c = cos(swirlAngle);
        float nx = pos.x * c - pos.z * s;
        float nz = pos.x * s + pos.z * c;
        vec3 moveMid = (vec3(nx, pos.y, nz) - pos) * isMid;

        // 3. High - 高频闪烁 (Shimmer)
        float noise = sin(uTime * 8.0 + pos.x);
        vec3 moveHigh = dir * noise * uHigh * 5.0 * uHighAmp;

        pos *= uHandScale;
        pos += (moveBass * isBass) + moveMid + (moveHigh * isHigh);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float beatSize = 1.0 + (isBass * uBass * uLowAmp) + (isHigh * uHigh * uHighAmp);
        gl_PointSize = (uBaseSize * size * beatSize * uHandScale * 3.0) * (300.0 / -mvPosition.z);

        vIntensity = (isBass * uBass) + (isMid * uMid) + (isHigh * uHigh);
    }
`;

// 片元着色器
export const fragmentShader = `
    varying float vType;
    varying float vIntensity;
    uniform float uHandScale;

    void main() {
        // 圆形粒子
        if (dot(gl_PointCoord - 0.5, gl_PointCoord - 0.5) > 0.25) discard;

        // 颜色定义
        vec3 colBass = vec3(1.0, 0.0, 0.5);  // 粉红 - 低频
        vec3 colMid = vec3(0.0, 1.0, 0.8);   // 青色 - 中频
        vec3 colHigh = vec3(1.0, 1.0, 0.5);  // 黄色 - 高频

        float isBass = 1.0 - step(0.33, vType);
        float isHigh = step(0.66, vType);
        float isMid = 1.0 - isBass - isHigh;

        vec3 finalCol = (colBass * isBass) + (colMid * isMid) + (colHigh * isHigh);
        finalCol += vec3(vIntensity * 0.8);

        gl_FragColor = vec4(finalCol, 0.85);
    }
`;

// 创建 uniforms 对象
export function createUniforms() {
    return {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
        uHandScale: { value: 1.0 },
        uLowAmp: { value: 2.0 },
        uMidAmp: { value: 2.0 },
        uHighAmp: { value: 2.0 },
        uBaseSize: { value: 2.0 }
    };
}
