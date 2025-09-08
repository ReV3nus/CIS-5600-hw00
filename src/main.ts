import {vec3, vec4} from 'gl-matrix';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import Cube from './geometry/Cube';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  baseColor: "#3c0606",
  segmentations: 1,
  size: 2,
  noiseSize: 128,
  'Load Scene': loadScene, // A function pointer, essentially

  w0: 0.5,
  iRange: "(1.0, 7.0, 1.0)",
  flowSpeed: "(0.002, 0.0007)",
  gradDisp: "(0.34, 0.01, 0.005)",
  gradRot: "(-1.5, -2.0, -2.5, 0.006)",
  octs: "(0.5, 7.0, 0.5)",
  mixW: 0.5,
  scaling: "(1.7, 1.6, 0.75)",
  expo: 1.4,


  waveSpeed : 2.,
  waveAmpl : 0.15,
};

let icosphere: Icosphere;
let square: Square;
let cube: Cube;

let prevSgm: number = 0;
let prevSize: number = 0;

function loadScene() {
  // icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
  // icosphere.create();
  // square = new Square(vec3.fromValues(0, 0, 0));
  // square.create();
  cube = new Cube(vec3.fromValues(0, 0, 0), controls.size, controls.segmentations);
  cube.create();
}

function generate3DNoise(gl: WebGL2RenderingContext, size: number): WebGLTexture 
{
  console.log("generating " + size);
  const data = new Uint8Array(size * size * size);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      for (let k = 0; k < size; k++) {
        const idx = i * size * size + j * size + k;
        data[idx] = Math.random() * 255;
      }
    }
  }
  console.log("Debug " + data.slice(0,10));

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, tex);

  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);

  gl.texImage3D(
    gl.TEXTURE_3D,
    0,                // mip level
    gl.R8,
    size, size, size, 
    0,
    gl.RED,
    gl.UNSIGNED_BYTE,
    data
  ); // got error when set to R32F and FLoat

  gl.bindTexture(gl.TEXTURE_3D, null);

  console.log("generated " + size);
  return tex;
}


function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.addColor(controls, 'baseColor').name('Basic Color');
  gui.add(controls, 'segmentations', 0, 8).step(1);
  gui.add(controls, 'size', 0.2, 5);
  gui.add(controls, 'Load Scene');

  gui.add(controls, 'waveSpeed', 0.01, 5);
  gui.add(controls, 'waveAmpl', 0, 0.5);

  const fbmParamsFolder = gui.addFolder("FBM Params");
  fbmParamsFolder.add(controls, 'w0');
  fbmParamsFolder.add(controls, 'iRange');
  fbmParamsFolder.add(controls, 'flowSpeed');
  fbmParamsFolder.add(controls, 'gradDisp');
  fbmParamsFolder.add(controls, 'gradRot');
  fbmParamsFolder.add(controls, 'octs');
  fbmParamsFolder.add(controls, 'mixW');
  fbmParamsFolder.add(controls, 'scaling');
  fbmParamsFolder.add(controls, 'expo');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  const magmaShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/magma-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/magma-frag.glsl')),
  ]);

  const noiseTex = generate3DNoise(gl, controls.noiseSize);
  magmaShader.setNoiseTex(noiseTex);

  prevSgm = controls.segmentations;
  prevSize = controls.size;
  
  // gl.enable(gl.BLEND);
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    if(controls.segmentations != prevSgm || controls.size != prevSize)
    {
      prevSgm = controls.segmentations;
      prevSize = controls.size;
      cube = new Cube(vec3.fromValues(0, 0, 0), controls.size, controls.segmentations);
      cube.create();
      // icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, prevTesselations);
      // icosphere.create();
    }

    const intColor = parseInt(controls.baseColor.slice(1), 16);
    const vec4Color = vec4.fromValues(
        ((intColor >> 16) & 255) / 255.0,
        ((intColor >> 8) & 255) / 255.0,
        (intColor & 255) / 255.0,
        1
    )

    magmaShader.setMagmaParams(controls, performance.now() * 0.001);
    renderer.render(camera, magmaShader, [
      cube,
      //icosphere,
      //square,
    ], vec4Color);

    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
