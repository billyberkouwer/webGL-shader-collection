import { createNoise3D } from '/public/simplex-noise.js';
const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl');
const { mat4, mat3, mat2, vec3 } = glMatrix;


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

const noise3d = createNoise3D();

function generatePointVertex(numberOfPoints) {
    let points = [];
    let cloud = []
    
    let x = 2;
    let y = 5;
    let z = 50;
    const xInc = 0.000001;
    const yInc = 0.001;
    const zInc = 0.9;
    
    for (let point = 0; point < numberOfPoints; point++) {
        x+=xInc;
        y+=yInc;
        z+=zInc;
        const value3d = noise3d(x, y, z) ;
        x+=xInc;
        y+=yInc;
        z+=zInc;
        const value3d2 = noise3d(x, y, z);
        x+=xInc;
        y+=yInc;
        z+=zInc;
        const value3d3 = noise3d(x, y, z);
        // const r = () => Math.random()-0.5;
        const cloud = [value3d, value3d2, value3d3];
        const outputPoint = (vec3.create(), cloud);
        points.push(...outputPoint);
    }
    const displaced = points.map((el, i) => el/=noise3d(i/4.9,i/1.99,i/100))
    cloud = displaced.map(el => el = el/400)
    console.log(cloud)
    console.log(points)
    return cloud;
}



function displacePoints() {
    let points = [];
    points = vertexData.map(el => (el += value3d));
    return points;
}

vertexData = generatePointVertex(750000);

function randomColor() {
    return [
        0, 
        0, 
        0,
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
    gl_PointSize = 0.75;
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
    // vertexData = displacePoints();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.DYNAMIC_DRAW);
    // ROTATE
    mat4.rotateX(modelMatrix, modelMatrix, Math.PI/2 / ((mouseLocation.x - mouseLocation.x / 2) + 100));
    mat4.rotateY(modelMatrix, modelMatrix, Math.PI/2 / ((mouseLocation.y - mouseLocation.y / 2) + 100));

    //  Projection Matrix (p), Model Matrix (m)
    // p * m
    mat4.multiply(mvMatrix, viewMatrix, modelMatrix);
    mat4.multiply(mvpMatrix, projectionMatrix, mvMatrix);
    gl.uniformMatrix4fv(uniformLocations.matrix, false, mvpMatrix);
    gl.drawArrays(gl.POINTS, 0, vertexData.length / 3);
}

animate();