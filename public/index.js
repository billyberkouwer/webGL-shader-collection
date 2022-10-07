import { createNoise3D, createNoise4D, createNoise2D } from '/public/simplex-noise.js';
const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl');
const { mat4, mat3, mat2, vec3, vec2 } = glMatrix;


if (!gl) {
    throw new Error('WebGL is not supported in your web browser');
};

const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;
const mouseLocation = {x: 100, y: 100};
window.addEventListener('mousemove', (event) => {
    mouseLocation.x = event.clientX-50;
    mouseLocation.y = event.clientY-50;
});

// vertex data
// const vertexData = [
//     // Front
//     0.5, 0.5, 0.5,
//     0.5, -.5, 0.5,
//     -.5, 0.5, 0.5,
//     -.5, 0.5, 0.5,
//     0.5, -.5, 0.5,
//     -.5, -.5, 0.5,

//     // Left
//     -.5, 0.5, 0.5,
//     -.5, -.5, 0.5,
//     -.5, 0.5, -.5,
//     -.5, 0.5, -.5,
//     -.5, -.5, 0.5,
//     -.5, -.5, -.5,

//     // Back
//     -.5, 0.5, -.5,
//     -.5, -.5, -.5,
//     0.5, 0.5, -.5,
//     0.5, 0.5, -.5,
//     -.5, -.5, -.5,
//     0.5, -.5, -.5,

//     // Right
//     0.5, 0.5, -.5,
//     0.5, -.5, -.5,
//     0.5, 0.5, 0.5,
//     0.5, 0.5, 0.5,
//     0.5, -.5, 0.5,
//     0.5, -.5, -.5,

//     // Top
//     0.5, 0.5, 0.5,
//     0.5, 0.5, -.5,
//     -.5, 0.5, 0.5,
//     -.5, 0.5, 0.5,
//     0.5, 0.5, -.5,
//     -.5, 0.5, -.5,

//     // Bottom
//     0.5, -.5, 0.5,
//     0.5, -.5, -.5,
//     -.5, -.5, 0.5,
//     -.5, -.5, 0.5,
//     0.5, -.5, -.5,
//     -.5, -.5, -.5,
// ];

let vertexData;

const noiseDisplacement = createNoise2D();

function generatePointVertex(time) {
    const points = [];
    const X = 99;
    const Y = 49;
    const Z = 49;
    let [x_X, y_X, z_X] = [-0.5,-0.5,-0.5];
    let x_Y, y_Y, z_Y;
    let x_Z, y_Z, z_Z;
    for (let pointX = 0; pointX < X; pointX++) {
        [x_X, y_X, z_X] = [x_X+=(1/X), y_X, z_X];
        const xVertex = (vec3.create(), [x_X, y_X, z_X])
        points.push(...xVertex);
        [x_Y, y_Y, z_Y] = [x_X, y_X, z_X];
        for (let pointY = 0; pointY < Y; pointY++) {
            [x_Y, y_Y, z_Y] = [x_Y, y_Y+=(1/X), z_Y];
            const yVertex = (vec3.create(), [x_Y, y_Y+=(noiseDisplacement((pointX*2+time)/X, 0)/(X*4)), z_Y]);
            points.push(...yVertex);
            [x_Z, y_Z, z_Z] = [x_Y, y_Y, z_Y];
            for (let pointZ = 0; pointZ < Z; pointZ++) {
                [x_Z, y_Z, z_Z] = [x_Z, y_Z, z_Z+=(1/Z)];
                const zVertex = (vec3.create(), [x_Z, y_Z, z_Z]);
                points.push(...zVertex);
            }
        }
    }
    return points;
}

vertexData = generatePointVertex();

function randomColor(vertexPosition) {
    const absVal = vertexPosition.map((el) => Math.abs(el-.24))
    return [
        absVal[0]/1.4, absVal[0]/1.4, 1
    ];
}

let colorData = [];
for (let i = 0; i < vertexData.length; i++) {
    colorData.push(...randomColor([vertexData[i], vertexData[i+1], vertexData[i+2]]))
}

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.DYNAMIC_DRAW);

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);

const vertexShader = gl.createShader(gl.VERTEX_SHADER);

gl.shaderSource(vertexShader, `
precision highp float;

attribute vec3 position;
attribute vec3 color;
varying vec3 vColor;

uniform mat4 matrix;

void main() {
    vColor = color;
    gl_Position = matrix * vec4(position, 1);
    gl_PointSize = 12.0;
}
`);

gl.compileShader(vertexShader);

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, `
precision highp float;

varying vec3 vColor;

void main() {
    gl_FragColor = vec4(vColor, 1);
}
`);
gl.compileShader(fragmentShader);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

const positionLocation = gl.getAttribLocation(program, `position`);
gl.enableVertexAttribArray(positionLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

const colorLocation = gl.getAttribLocation(program, `color`);
gl.enableVertexAttribArray(colorLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

gl.useProgram(program);
gl.enable(gl.DEPTH_TEST)

// always do this after linking and using program
const uniformLocations = {
    matrix: gl.getUniformLocation(program, `matrix`),
};

const modelMatrix = mat4.create();
const viewMatrix = mat4.create();
const projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix,
    50 * Math.PI/180,    // vertical field of view (angle in rad)
    canvas.width/canvas.height,    // aspect ratio
    1e-4,     // near cull distance
    1e4,     // far cull distance
);

const mvMatrix = mat4.create();
const mvpMatrix = mat4.create();
mat4.translate(modelMatrix, modelMatrix, [0, 0.25, -3]);
mat4.rotateX(modelMatrix, modelMatrix, Math.PI/10)

mat4.translate(viewMatrix, viewMatrix, [0, 0, 0]);
mat4.invert(viewMatrix, viewMatrix);

let time = 0;

function animate() {
    requestAnimationFrame(animate);
    time+=1;
    let displacedVertexes = generatePointVertex(time);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(displacedVertexes), gl.DYNAMIC_DRAW);
    // ROTATE
    // mat4.rotateX(modelMatrix, modelMatrix, Math.PI/2 / ((mouseLocation.x - mouseLocation.x / 2) + 100));
    mat4.rotateY(modelMatrix, modelMatrix, Math.PI/2/300);

    //  Projection Matrix (p), Model Matrix (m)
    // p * m
    mat4.multiply(mvMatrix, viewMatrix, modelMatrix);
    mat4.multiply(mvpMatrix, projectionMatrix, mvMatrix);
    gl.uniformMatrix4fv(uniformLocations.matrix, false, mvpMatrix);
    gl.drawArrays(gl.POINTS, 0, displacedVertexes.length / 3);
}

animate();