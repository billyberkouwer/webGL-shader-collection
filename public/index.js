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
let colorData;
const noise3d = createNoise3D();

function generatePointVertex(time) {
  const points = [];
  const colorArr = [];
  const X = 110;
  const Y = 110;

  for (let pointX = 0; pointX < X; pointX++) {
    const strip = [];
    for (let pointY = 0; pointY < Y; pointY++) {
      const aX = (pointY / Y);
      const aY = (pointX / X);
      const aZ = 0;
      const bX = aX;
      const bY = ((pointX + 1) / X);
      const bZ = 0;
      const cX = ((pointY + 1) / Y);
      const cY = aY;
      const cZ = 0;
      const [dX, dY, dZ] = [cX, cY, 0];
      const [eX, eY, eZ] = [bX, bY, 0];
      const fX = cX;
      const fY = bY;
      const fZ = 0;
      strip.push(
        aX,
        aY,
        aZ,
        bX,
        bY,
        bZ,
        cX,
        cY,
        cZ,
        dX,
        dY,
        dZ,
        eX,
        eY,
        eZ,
        fX,
        fY,
        fZ
      );
    }
    points.push(...strip)

    for (let i = 0; i < strip.length; i++) {
      const smallNoiseVal = noise3d(pointX * 0.2, (i / (X / 2)), (time + 1) / 100) / 4;
      const bigNoiseVal = noise3d(pointX * 0.05, (i / (X / 0.5)), (time + 1) / 100) / 4;
      const massiveNoiseVal = noise3d(pointX * 0.008, (i / (X / 0.08)), (time + 1) / 100) ;
      const sinWave = Math.sin(((pointX * 0.05) - Math.sin((pointX * 0.05) + time/20)) + (Math.sin((pointX * 0.05) + time/20)/4) * massiveNoiseVal + time/20) * 2;
      const noiseSin = createWave();
      function createWave() {
        if (smallNoiseVal + sinWave <= -2) {
          return sinWave + smallNoiseVal;
        } else {
          return sinWave + bigNoiseVal;
        }
      }
      colorArr.push(noiseSin)
    }
  }

  // for (let i = 0; i < points.length; i++) {
  //   const noiseVal = noise2d(i * 0.001, 1);
  //   colorArr.push(
  //     noiseVal
  //   );
  // }
  return {vertices: points, colors: colorArr};
}

vertexData = generatePointVertex().vertices;
colorData = generatePointVertex().colors;

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
  varying vec3 vPosition;

  uniform mat4 matrix;

  void main() {
      vColor = color * vec3(0.5, 0.8, 0.3);
      vPosition = position + (color * vec3(0.0, 0.0, 0.04));
      gl_Position = matrix * vec4(vPosition, 1);
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
      gl_FragColor = vec4(0.0 - vColor.r, 0.0 - vColor.g, 1.0 - vColor.b, 1.0);
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
mat4.rotateX(modelMatrix, modelMatrix, Math.PI/1.5)
mat4.rotateZ(modelMatrix, modelMatrix, Math.PI/2)
mat4.translate(viewMatrix, viewMatrix, [-0.5, -0.25, 3]);
mat4.invert(viewMatrix, viewMatrix);

let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 1;
  let meshData = generatePointVertex(time)
  let displacedVertexes = meshData.vertices;
  let noiseColors = meshData.colors;
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(displacedVertexes),
    gl.DYNAMIC_DRAW
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(noiseColors), gl.DYNAMIC_DRAW);
  // ROTATE
  // mat4.rotateX(modelMatrix, modelMatrix, Math.PI/2 / ((mouseLocation.x - mouseLocation.x / 2) + 100));
  // mat4.rotateY(viewMatrix, viewMatrix, Math.PI / 2 / 300);

  //  Projection Matrix (p), Model Matrix (m)
  // p * m
  mat4.multiply(mvMatrix, viewMatrix, modelMatrix);
  mat4.multiply(mvpMatrix, projectionMatrix, mvMatrix);
  gl.uniformMatrix4fv(uniformLocations.matrix, false, mvpMatrix);
  gl.drawArrays(gl.TRIANGLES, 0, displacedVertexes.length / 3);
}

animate();