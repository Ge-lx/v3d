
let scene = null, camera = null, controls = null, renderer = null, space = null

function setup () {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
  controls = new THREE.OrbitControls( camera, getByID('canvas') );
  renderer = new THREE.WebGLRenderer();

  moveCamera([100, 100, 100], [0, 0, 0])

  renderer.setSize( window.innerWidth, window.innerHeight );
  getByID('canvas').appendChild( renderer.domElement );
}

function moveCamera (position, target) {
  camera.position.set( ...position );
  camera.lookAt( ...target );

  //controls.update() must be called after any manual changes to the camera's transform
  controls.update();
}

// Main animation loop
function animate() {
  requestAnimationFrame( animate );
  space.update()
  controls.update();

  renderer.render( scene, camera );
}

/*  Parameters

initialize (
  function transform(vector : float[3] ) => float[3],      The vectorfield to display
  space_config: Object {                                   The space configuration
    range: { x: float[2], y: float[2], z: float[2] }         - particle spawn range
    linecount: int                                           - line count
    linebuffer: int                                          - line buffer size
    decay: float                                             - line reset propability
    timestep: float                                          - animation timestep
    scale: float                                             - scale of the range
  }

*/
function initialize (transformation, space_cfg) {
  console.log(space_cfg)
  if (!space) {
    space = new Space(space_cfg.range, space_cfg.linecount, space_cfg.linebuffer, space_cfg.decay, space_cfg.timestep, space_cfg.scale)
  }
  else {
    space.changeConfig(space_cfg)
  }
  space.applyTransformation(transformation)
}





// var axesHelper = new THREE.AxesHelper(1000 );
// scene.add( axesHelper );



// var geometry = new THREE.BoxGeometry( 1, 1, 1 );
// var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
// var cube = new THREE.Mesh( geometry, material );
// scene.add( cube );

// ---- create a blue LineBasicMaterial
// var material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
// var geometry = new THREE.Geometry();

// geometry.vertices.push(new THREE.Vector3( -10, 0, 0) );
// geometry.vertices.push(new THREE.Vector3( 0, 10, 0) );
// geometry.vertices.push(new THREE.Vector3( 10, 0, 0) );

// var line = new THREE.Line( geometry, material );
// scene.add( line );

// let matrix = [  ]



function vMATRIX (v, t) {
  let result = [ v[0]*t[0][0] + v[1]*t[0][1] + v[2]*t[0][2],
                 v[0]*t[1][0] + v[1]*t[1][1] + v[2]*t[1][2],
                 v[0]*t[2][0] + v[1]*t[2][1] + v[2]*t[2][2] ]
}

function vMULTIPLY (v1, s) {
  v1[0] *= s
  v1[1] *= s
  v1[2] *= s
  return v1
} 

function vADD (v1, v2) {
  v1[0] += v2[0]
  v1[1] += v2[1]
  v1[2] += v2[2]
  return v1
}

function vSUB (v1, v2) {
  v1[0] -= v2[0]
  v1[1] -= v2[1]
  v1[2] -= v2[2]
  return v1 
}

function randomBetween (range) {
  return ((Math.random()) * (range[1] - range[0]) + range[0])
}

class Line {

  constructor (point, maxPoints, decayProbability, space) {
    this.maxPoints = maxPoints
    this.space = space
    this.decay = decayProbability


    let geometry= new THREE.BufferGeometry();
    let positions = new Float32Array( maxPoints * 3 ); // 3 vertices per point
    geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    // material & line
    let material = new THREE.LineBasicMaterial( { color: 0xFFF070, linewidth: 2 } );
    this.threeLine = new THREE.Line( geometry,  material );
    scene.add(this.threeLine);

    this.drawCount = 0
    this.addPoint(point)
    this.currentPoint = point
  }

  addPoint (p) {
    var i = this.drawCount * 3
    let positions = this.threeLine.geometry.attributes.position.array;

    let scale = this.space.scale

    positions[i] = p[0] * scale
    positions[i+1] = p[1] * scale
    positions[i+2] = p[2] * scale

    this.threeLine.geometry.setDrawRange(0, this.drawCount);
    this.threeLine.geometry.attributes.position.needsUpdate = true;
    // this.threeLine.geometry.computeBoundingSphere();
  }

  update () {
    this.drawCount = ( this.drawCount + 1 ) % this.maxPoints;

    if ( Math.pow((this.drawCount / this.maxPoints), 2) + Math.random() * this.decay > 1) {
      this.drawCount = 0
    }
    // console.log('drawCount: ' + this.drawCount)
    if (this.drawCount === 0) {
      this.currentPoint = this.space.randomPoint()
    } else {
      this.currentPoint = space.transformVector(this.currentPoint)
    }
    this.addPoint(this.currentPoint)
  }

  destroy () {
    scene.remove(this.threeLine)
  }
}

// -------------
class Space {

  constructor (range, maxLines, maxPoints, decay, timestep, scale) {
    this.bounds = range
    this.vf = null // Currently there is no vectorfield active
    this.timestep = timestep
    this.maxLines = maxLines
    this.maxPoints = maxPoints
    this.scale = scale
    this.decay = decay

    this.spawnLines()
  }

  changeConfig (opt) {
    this.bounds = opt.range
    this.maxLines = opt.linecount
    this.maxPoints = opt.linebuffer
    this.scale = opt.scale
    this.decay = opt.decay
    this.timestep = opt.timestep
    this.spawnLines()
  }

  // calculateBounds () {
  //   let minx = Math.min(this.a[0], this.b[0])
  //   let miny = Math.min(this.a[1], this.b[1])
  //   let minz = Math.min(this.a[2], this.b[2])
  //   let maxx = Math.max(this.a[0], this.b[0])
  //   let maxy = Math.max(this.a[1], this.b[1])
  //   let maxz = Math.max(this.a[2], this.b[2])
  //   this.bounds = { x: [minx, maxx],
  //                   y: [miny, maxy],
  //                   z: [minz, maxz] }
  // }

  spawnLines () {
    if(this.lines)
      this.lines.forEach(line => line.destroy())

    this.lines = new Array(this.maxLines)
    for (let i = 0; i < this.maxLines; i++) {
      this.lines[i] = (new Line(this.randomPoint(), this.maxPoints, this.decay, this))
    }
  }

  randomPoint () {
    return [ randomBetween(this.bounds.x),
             randomBetween(this.bounds.y),
             randomBetween(this.bounds.z) ]
  }

  applyTransformation (vf) {
    this.transform = true
    this.vf = vf
  }

  pauseResumeTransformation () {
    this.transform = !this.transform
  }

  transformVector (v) {
    if (!(this.transform && this.vf)) return v

    let direction = this.vf(v)
    let res = vADD(v, vMULTIPLY(direction, this.timestep))
    return res
  }

  update () {
    for (let line of this.lines) {
      line.update()
    }
  }
}


// --------------- UI
function getByID (id) {
  return document.getElementById(id)
}

let default_transformation = `return [
  0,
  2 * Math.cos(0.04*v[2]),
  2* Math.sin(0.02*v[1])
];`
const wrapper = '(function transform (v) { %exp% })'

function evalTransformFunction () {
  let custom_js = getByID('userjs').value
  let custom_fn = null
  try {
    //custom_js = eval(custom_js) ? custom_js : default_transformation
    let str = wrapper.replace('%exp%', custom_js)
    console.log(str)
    custom_fn = eval(str)
    getByID('evalerror').innerHTML = ''
  } catch (error) {
    getByID('evalerror').innerHTML = error.message
  }
  return custom_fn
}

function readConfig () {
  return {
    range: { x: [parseFloat(getByID('rangex1').value), parseFloat(getByID('rangex2').value)],
             y: [parseFloat(getByID('rangey1').value), parseFloat(getByID('rangey2').value)],
             z: [parseFloat(getByID('rangez1').value), parseFloat(getByID('rangez2').value)] },
    linecount: parseInt(getByID('linecount').value),
    linebuffer: parseInt(getByID('linebuffer').value),
    decay: parseFloat(getByID('decay').value),
    timestep: parseFloat(getByID('timestep').value),
    scale: parseFloat(getByID('scale').value)
  }
}

function applyUserChanges () {
  let fn = evalTransformFunction()
  console.log(fn)
  initialize( fn, readConfig() )
}


document.addEventListener("DOMContentLoaded", () => {
  autosize(document.querySelector('textarea'))
  setup()
  applyUserChanges()
  animate()
})
// function default_transformation (v) {
//   //return [ 3 * v[2], v[0]*v[0] * v[1]*v[1], v[0]*v[2]] Theo Blatt 1
  
// }
