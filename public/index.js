import {
  createNoise3D,
  createNoise4D,
  createNoise2D,
} from "/public/simplex-noise.js";
const canvas = document.querySelector("canvas");
const gl = canvas.getContext("webgl");
const { mat4, mat3, mat2, vec3, vec2 } = glMatrix;

if (!gl) {
  throw new Error("WebGL is not supported in your web browser");
}

const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;
const mouseLocation = { x: 100, y: 100 };
window.addEventListener("mousemove", (event) => {
  mouseLocation.x = event.clientX - 50;
  mouseLocation.y = event.clientY - 50;
});

let vertexData;
let colorIndex = 0;
let colorData = [];
const noise2d = createNoise2D();
const noise3d = createNoise3D();

function randomColor(i) {
  return [
    Math.abs(noise2d(0, i)) + 0.2,
    Math.abs(noise2d(0, i)) + 0.2,
    Math.abs(noise2d(0, i)) + 0.8,
  ];
}

const createColor = (x, y) => {
  let colors = [];
  for (let xIndex = 0; xIndex < x; xIndex++) {
    for (let yIndex = 0; yIndex < y; yIndex++) {
      colors.push(noise2d(100/xIndex, 100/xIndex))
    }
  }
  return colors;
};

function generatePointVertex(time) {
  const points = [];
  const X = 50;
  const Y = 50;
  const colorArr = [];
  
  for (let pointX = 0; pointX < X; pointX++) {
    const strip = [];
    let colorStrip;

    for (let pointY = 0; pointY < Y; pointY++) {
      const aX = (1 / Y) * pointY;
      const aY = (1 / X) * pointX;
      const aZ = 0;
      const bX = aX;
      const bY = (1 / X) * (pointX + 1);
      const bZ = 0;
      const cX = (1 / Y) * (pointY + 1);
      const cY = aY;
      const cZ = 0;
      const [dX, dY, dZ] = [cX, cY, cZ];
      const [eX, eY, eZ] = [bX, bY, bZ];
      const fX = cX;
      const fY = bY;
      const fZ = 0;
      strip.push(aX, aY, aZ, bX, bY, bZ, cX, cY, cZ, dX, dY, dZ, eX, eY, eZ, fX, fY, fZ);
      colorStrip = strip.map((el, i) => {return (noise3d((pointX/(X/7)), (i/Y), ((time+2)/50)))});
    }
    colorArr.push(...colorStrip)
    points.push(...strip);
  }
  colorData = colorArr;
  return points;
}

vertexData = generatePointVertex();

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.DYNAMIC_DRAW);

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.DYNAMIC_DRAW);

const vertexShader = gl.createShader(gl.VERTEX_SHADER);

gl.shaderSource(
  vertexShader,
  `
  precision highp float;

  attribute vec3 position;
  attribute vec3 color;
  varying vec3 vColor;

  uniform mat4 matrix;

  void main() {
      vColor = color;
      gl_Position = matrix * vec4(position, 1);
      gl_PointSize = 20.0;
  }
`
);

gl.compileShader(vertexShader);

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(
  fragmentShader,
  `
  precision highp float;

  varying vec3 vColor;

  void main() {
      gl_FragColor = vec4(vColor, 1);
  }
`
);
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
gl.enable(gl.DEPTH_TEST);

// always do this after linking and using program
const uniformLocations = {
  matrix: gl.getUniformLocation(program, `matrix`),
};

const modelMatrix = mat4.create();
const viewMatrix = mat4.create();
const projectionMatrix = mat4.create();
mat4.perspective(
  projectionMatrix,
  (50 * Math.PI) / 180, // vertical field of view (angle in rad)
  canvas.width / canvas.height, // aspect ratio
  1e-4, // near cull distance
  1e4 // far cull distance
);

const mvMatrix = mat4.create();
const mvpMatrix = mat4.create();
mat4.translate(modelMatrix, modelMatrix, [0, 0, 0]);
// mat4.rotateX(modelMatrix, modelMatrix, Math.PI/1.5);
mat4.translate(viewMatrix, viewMatrix, [0.5, 0.5, 2]);
mat4.invert(viewMatrix, viewMatrix);

let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 1;
  let displacedVertexes = generatePointVertex(time);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(displacedVertexes),
    gl.DYNAMIC_DRAW
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.DYNAMIC_DRAW);
  // ROTATE
  // mat4.rotateX(modelMatrix, modelMatrix, Math.PI/2 / ((mouseLocation.x - mouseLocation.x / 2) + 100));
  // mat4.rotateY(modelMatrix, modelMatrix, Math.PI / 2 / 300);

  //  Projection Matrix (p), Model Matrix (m)
  // p * m
  mat4.multiply(mvMatrix, viewMatrix, modelMatrix);
  mat4.multiply(mvpMatrix, projectionMatrix, mvMatrix);
  gl.uniformMatrix4fv(uniformLocations.matrix, false, mvpMatrix);
  gl.drawArrays(gl.TRIANGLES, 0, displacedVertexes.length / 3);
}

animate();