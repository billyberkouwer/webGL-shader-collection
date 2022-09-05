const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl');
const { mat4, mat3, mat2 } = glMatrix;

if (!gl) {
    throw new Error('WebGL is not supported in your web browser');
};

const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;

let vertexData = [
    -1, 1, 0,
    1, 1, 0,
    1, -1, 0,
    -1, 1, 0,
    1, -1, 0,
    -1, -1, 0,
];

let colorData = [
    0.1, 0.5, 0.9,
    1, 0, 0,
    0, 0.3, 1,
    0, 1, 1,
    1, 0, 0,
    0, 0, 1,
];

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);

const matrix = mat4.create();
mat4.rotateZ(matrix, matrix, Math.PI/2);
mat4.scale(matrix, matrix, [0.5, 0.5, 0.5]);

console.log(matrix); 

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

// always do this after linking and using program
const uniformLocations = {
    matrix: gl.getUniformLocation(program, `matrix`),
};

function animate() {
    requestAnimationFrame(animate);
    mat4.rotateZ(matrix, matrix, Math.PI/2 / 100);
    gl.uniformMatrix4fv(uniformLocations.matrix, false, matrix);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

animate()