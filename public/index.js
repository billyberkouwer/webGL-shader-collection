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
const [xInc, yInc, zInc] = [Math.random()/100000000, Math.random()/10000000, Math.random()/10];
let [x,y,z,w] = [1,1,1,1]

function generatePointVertex() {
    const points = [];
    const X = 100;
    const Y = 100;
    let [x, y, z] = [0, 0, 0];
    for (let pointX = 0; pointX < X; pointX++) {
        [x, y, z] = [x+=(1/X)+noiseDisplacement(x*10, 0)/X, y+noiseDisplacement(x, 0)/X, 0];
        const xVertex = (vec3.create(), [x,y,z])
        points.push(...xVertex);
        let [xWid, yWid, zWid] = [x, y, 0];
        for (let pointY = 0; pointY < Y; pointY++) {
            [xWid, yWid, zWid] = [x, yWid+=(1/Y), 0];
            const yVertex = (vec3.create(), [xWid, yWid, zWid]);
            points.push(...yVertex);
        }
    }
    console.log(points)
    return points;
}


function displacePoints(points) {
    console.log(points)
    const displacedPoints = [];
    const [xInc, yInc, zInc, wInc] = [0.001,0.000002,1, 0.0000001];
    const pointValues = [];
    for (let i = 0; i < points.length; i++) {
        if ((i % 4) == 0) {
            pointValues.push(points[i] + (noiseDisplacement(1, 1, 1, 1)));
        }   else {
            pointValues.push(points[i])
        }
    }
    return pointValues;
}

vertexData = generatePointVertex();

function randomColor() {
    return [
        0,0,0
    ];
}

// generate random colors and assign the same color to each vertex on a face
let colorData = [];
for (let i = 0; i < vertexData.length; i++) {
    colorData.push(...randomColor())
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
    gl_PointSize = 1.0;
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
mat4.translate(modelMatrix, modelMatrix, [0, 0, -3]);

mat4.translate(viewMatrix, viewMatrix, [0, 0, 0]);
mat4.invert(viewMatrix, viewMatrix);


function animate() {
    requestAnimationFrame(animate);
    let displacedVertexes = vertexData
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(displacedVertexes), gl.DYNAMIC_DRAW);
    // ROTATE
    mat4.rotateX(modelMatrix, modelMatrix, Math.PI/2 / ((mouseLocation.x - mouseLocation.x / 2) + 100));
    // mat4.rotateY(modelMatrix, modelMatrix, Math.PI/2 / ((mouseLocation.y - mouseLocation.y / 2) + 100));

    //  Projection Matrix (p), Model Matrix (m)
    // p * m
    mat4.multiply(mvMatrix, viewMatrix, modelMatrix);
    mat4.multiply(mvpMatrix, projectionMatrix, mvMatrix);
    gl.uniformMatrix4fv(uniformLocations.matrix, false, mvpMatrix);
    gl.drawArrays(gl.POINTS, 0, displacedVertexes.length / 3);
}

animate();