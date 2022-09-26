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
    mouseLocation.x = event.clientX;
    mouseLocation.y = event.clientY;
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

function generatePointVertex(numberOfPoints) {
    let points = []
    for (let point = 0; point < numberOfPoints; point++) {
        const r = () => Math.random() - 0.5;
        const xyz = [r(), r(), r()];
        const outputPoint = vec3.normalize(vec3.create(), xyz);
        points.push(...outputPoint);
    }
    return points;
}

function displacePoints() {
    let points = [];
    let direction = Math.round(Math.random())
    if (direction) {
        points = vertexData.map(el => (el+=Math.random()*0.005));
        return points;
    }   else {
        points = vertexData.map(el => (el-=Math.random()*0.005));
        return points;
    }
}

vertexData = generatePointVertex(25000);

function randomColor() {
    return [
        Math.random()/4, 
        Math.random()/4, 
        Math.random()/4,
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
    vertexData = displacePoints();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.DYNAMIC_DRAW);
    // ROTATE
    // mat4.rotateX(modelMatrix, modelMatrix, Math.PI/2 / ((mouseLocation.x - mouseLocation.x / 2) + 100));
    // mat4.rotateY(modelMatrix, modelMatrix, Math.PI/2 / ((mouseLocation.y - mouseLocation.y / 2) + 100));

    //  Projection Matrix (p), Model Matrix (m)
    // p * m
    mat4.multiply(mvMatrix, viewMatrix, modelMatrix);
    mat4.multiply(mvpMatrix, projectionMatrix, mvMatrix);
    gl.uniformMatrix4fv(uniformLocations.matrix, false, mvpMatrix);
    gl.drawArrays(gl.POINTS, 0, vertexData.length / 3);
}

animate();