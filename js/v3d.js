var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set( 30, 30, 30 );
camera.lookAt( 0, 0, 0 );

var controls = new THREE.OrbitControls( camera );

//controls.update() must be called after any manual changes to the camera's transform
controls.update();

// var axesHelper = new THREE.AxesHelper(1000 );
// scene.add( axesHelper );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

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



function matrixTransform (v, t) {
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
  return (Math.random() - 0.5) * (range[0] - range[1]) + range[0]
}

class Line {

  constructor (point, maxPoints, space) {
    this.maxPoints = maxPoints
    this.space = space


    let geometry= new THREE.BufferGeometry();
    let positions = new Float32Array( maxPoints * 3 ); // 3 vertices per point
    geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    // material & line
    let material = new THREE.LineBasicMaterial( { color: 0xff0000, linewidth: 2 } );
    this.threeLine = new THREE.Line( geometry,  material );
    scene.add(this.threeLine);

    this.drawCount = 0
    this.addPoint(point)
    this.currentPoint = point
  }

  addPoint (p) {
    var i = this.drawCount * 3
    let positions = this.threeLine.geometry.attributes.position.array;

    let scale = 1

    positions[i] = p[0] * scale
    positions[i+1] = p[1] * scale
    positions[i+2] = p[2] * scale

    this.threeLine.geometry.setDrawRange(0, this.drawCount);
    this.threeLine.geometry.attributes.position.needsUpdate = true;
    // this.threeLine.geometry.computeBoundingSphere();
  }

  update () {
    this.drawCount = ( this.drawCount + 1 ) % this.maxPoints;

    let DECAY = 1

    if ( Math.pow((this.drawCount / this.maxPoints), 2) + Math.random() * DECAY > 1) {
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
}

// -------------
class Space {

  constructor (a, b, maxLines, maxPoints, timestep) {
    this.a = a
    this.b = b
    this.vf = null // Currently there is no vectorfield active
    this.timestep = timestep
    this.maxLines = maxLines
    this.maxPoints = maxPoints

    this.calculateBounds()
    this.spawnLines()
  }

  calculateBounds () {
    let minx = Math.min(this.a[0], this.b[0])
    let miny = Math.min(this.a[1], this.b[1])
    let minz = Math.min(this.a[2], this.b[2])
    let maxx = Math.max(this.a[0], this.b[0])
    let maxy = Math.max(this.a[1], this.b[1])
    let maxz = Math.max(this.a[2], this.b[2])
    this.bounds = { x: [minx, maxx],
                    y: [miny, maxy],
                    z: [minz, maxz] }
  }

  spawnLines () {
    if (!this.lines) this.lines = new Array(this.maxLines)
    for (let i = 0; i < this.maxLines; i++) {
      this.lines[i] = (new Line(this.randomPoint(), this.maxPoints, this))
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



function my_transform (v) {
  //return [ 3 * v[2], v[0]*v[0] * v[1]*v[1], v[0]*v[2]] Theo Blatt 1
  return [ Math.sin(0.5 * v[1]), Math.cos(0.5 * v[0]), 0.1 + (Math.sqrt(v[2]) * 0.01) ]
}

let A = [80, 80, 20], B = [0, 0, 0]

let space = new Space(A, B, 1000, 2048, 0.8)
space.applyTransformation(my_transform)

function animate() {
  requestAnimationFrame( animate );
  space.update()
  controls.update();

  renderer.render( scene, camera );
}
animate();