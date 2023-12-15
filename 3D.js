var canvas = document.getElementById("main");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var ctx = canvas.getContext("2d");
mouse.x = canvas.width/2;
mouse.y = canvas.height/2;

window.addEventListener("resize", function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cam.projectionMatrix.d[0][0] = canvas.height/canvas.width/tan(cam.fov*π/360);
    cam.imageData = ctx.createImageData(canvas.width, canvas.height);
});

V.letterMap = { x: 0, y: 1, z: 2, w: 2, r: 0, i: 1, j: 2, k: 3, u: 0, v: 1 };
const SMOL = 1e-8;

class Triangle {
    constructor(p1, p2, p3, color=[255, 255, 255], shade=1) {
        if (p1 instanceof Triangle) {
            this.p = [new V(p1.p[0]), new V(p1.p[1]), new V(p1.p[2])];
            this.color = p1.color;
            this.shade = p1.shade;
            this.useTex = p1.useTex;
            this.t = [new V(p1.t[0]), new V(p1.t[1]), new V(p1.t[2])];
            this.textureIndex = p1.textureIndex;
            return;
        } else if (p1 instanceof V) this.p = [p1, p2, p3];
        else {
            p1 = new V(p1 || [0, 0, 0]), p2 = new V(p2 || [0, 0, 0]), p3 = new V(p3 || [0, 0, 0]);
            this.p = [p1, p2, p3];
        }
        this.color = color;
        this.shade = shade;
        this.useTex = true;
        this.t = [new V(0, 0, 1), new V(0, 0, 1), new V(0, 0, 1)];
        this.textureIndex = 0;
    }
    fix(dim, fill=1) {
        this.p[0].fix(dim, fill);
        this.p[1].fix(dim, fill);
        this.p[2].fix(dim, fill);
        return this;
    }
    applyTransform(matrix) {
        var tnew = new Triangle(this);
        if (matrix.dim.x == 4 && tnew.p[0].dim == 3) tnew.fix(4);
        else if (matrix.dim.x == 3 && tnew.p[0].dim == 4) tnew.fix(3);
        tnew.p[0] = tnew.p[0].applyTransform(matrix);
        tnew.p[1] = tnew.p[1].applyTransform(matrix);
        tnew.p[2] = tnew.p[2].applyTransform(matrix);
        return tnew;
    }
    add(v) {
        var tri = new Triangle(this);
        tri.p[0] = tri.p[0].add(v);
        tri.p[1] = tri.p[1].add(v);
        tri.p[2] = tri.p[2].add(v);
        return tri;
    }
    sub(v) {
        var tri = new Triangle(this);
        tri.p[0] = tri.p[0].sub(v);
        tri.p[1] = tri.p[1].sub(v);
        tri.p[2] = tri.p[2].sub(v);
        return tri;
    }
    getNormal() {
        return this.p[1].sub(this.p[0]).cross(this.p[2].sub(this.p[0])).normalize();
    }
    log() {
        console.log(this.p[0].c, this.p[1].c, this.p[2].c);
    }
    GPUdraw() {
        for (var a = 0; a < 3; a++) if (this.p[a].z) {
            this.t[a].fix(3, 1);
            this.t[a] = this.t[a].mult(1/this.p[a].z);
            this.p[a] = this.p[a].mult(1/this.p[a].z);
        }

        //clip on upper cam edge
        var clippedTris1 = this.clip(new V(0, 1, 0), new V(0, -1, 0));
        //clip on lower cam edge
        var clippedTris2 = [];
        for (var a in clippedTris1) {
            var clipped = clippedTris1[a].clip(new V(0, -1, 0), new V(0, 1, 0));
            for (var b in clipped) clippedTris2.push(clipped[b]);
        }
        //clip on right cam edge
        var clippedTris3 = [];
        for (var a in clippedTris2) {
            var clipped = clippedTris2[a].clip(new V(-1, -0, 0), new V(1, 0, 0));
            for (var b in clipped) clippedTris3.push(clipped[b]);
        }
        //clip on left cam edge
        var clippedTris = [];
        for (var a in clippedTris3) {
            var clipped = clippedTris3[a].clip(new V(1, 0, 0), new V(-1, 0, 0));
            for (var b in clipped) clippedTris.push(clipped[b]);
        }
        let promiseList = [];
        for (var a = 0; a < clippedTris.length; a++) {
            if (this.useTex) {
                var thisTri = new Triangle(this);
                // map to screen dimensions
                thisTri.p[0].x = (clippedTris[a].p[0].x + 1) * canvas.width / 2;
                thisTri.p[0].y = (clippedTris[a].p[0].y + 1) * canvas.height / 2;
                thisTri.p[1].x = (clippedTris[a].p[1].x + 1) * canvas.width / 2;
                thisTri.p[1].y = (clippedTris[a].p[1].y + 1) * canvas.height / 2;
                thisTri.p[2].x = (clippedTris[a].p[2].x + 1) * canvas.width / 2;
                thisTri.p[2].y = (clippedTris[a].p[2].y + 1) * canvas.height / 2;

                thisTri.t = [new V(clippedTris[a].t[0]), new V(clippedTris[a].t[1]), new V(clippedTris[a].t[2])];

                promiseList.push(cam.texTriangle(thisTri));
            } else {
                // just use built in fill methods. Note that this can't use z-buffer
                ctx.fillStyle = `rgb(${round(this.color[0]*this.shade)}, ${round(this.color[1]*this.shade)}, ${round(this.color[2]*this.shade)})`;
                ctx.strokeStyle = ctx.fillStyle;
                ctx.beginPath();
                ctx.moveTo((clippedTris[a].p[0].x + 1) * canvas.width / 2, (clippedTris[a].p[0].y + 1) * canvas.height/2);
                ctx.lineTo((clippedTris[a].p[1].x + 1) * canvas.width / 2, (clippedTris[a].p[1].y + 1) * canvas.height/2);
                ctx.lineTo((clippedTris[a].p[2].x + 1) * canvas.width / 2, (clippedTris[a].p[2].y + 1) * canvas.height/2);
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
            }
        }
        return promiseList;
    }
    clip(n, p) {
        var clippedPoints = [n.dot(this.p[0].sub(p)) <= 0, n.dot(this.p[1].sub(p)) <= 0, n.dot(this.p[2].sub(p)) <= 0];
        var count = clippedPoints[0] + clippedPoints[1] + clippedPoints[2];

        switch (count) {
        case 3: return []; // no bad throw away
        case 0: return [this]; // original is ok already
        case 2: // clip 2 corners, return 1 triangle
            if (clippedPoints[0] == false) var key = [0, 1, 2];
            else if (clippedPoints[1] == false) var key = [1, 2, 0];
            else var key = [2, 0, 1];

            var pin = new V(this.p[key[0]]);
            var pout1 = new V(this.p[key[1]]);
            var pout2 = new V(this.p[key[2]]);
            var tin = new V(this.t[key[0]]);
            var tout1 = new V(this.t[key[1]]);
            var tout2 = new V(this.t[key[2]]);

            var t1 = n.dot(p.sub(pin))/n.dot(pout1.sub(pin));
            var t2 = n.dot(p.sub(pin))/n.dot(pout2.sub(pin));
            var pedge1 = V.lerp(pin, pout1, t1);
            var pedge2 = V.lerp(pin, pout2, t2);
            var tedge1 = V.lerp(tin, tout1, t1);
            var tedge2 = V.lerp(tin, tout2, t2);
            var tri = new Triangle(this);
            tri.p = [pin, pedge1, pedge2];
            tri.t = [tin, tedge1, tedge2];
            return [tri];
        case 1: // clip 1 corner, return 2 triangles
            if (clippedPoints[0] == true) var key = [0, 1, 2];
            else if (clippedPoints[1] == true) var key = [1, 2, 0];
            else var key = [2, 0, 1];

            var pout = new V(this.p[key[0]]);
            var pin1 = new V(this.p[key[1]]);
            var pin2 = new V(this.p[key[2]]);
            var tout = new V(this.t[key[0]]);
            var tin1 = new V(this.t[key[1]]);
            var tin2 = new V(this.t[key[2]]);
            
            var t1 = n.dot(p.sub(pin1))/n.dot(pout.sub(pin1));
            var t2 = n.dot(p.sub(pin2))/n.dot(pout.sub(pin2));
            var pedge1 = V.lerp(pin1, pout, t1);
            var pedge2 = V.lerp(pin2, pout, t2);
            var tedge1 = V.lerp(tin1, tout, t1);
            var tedge2 = V.lerp(tin2, tout, t2);
            var tri1 = new Triangle(this);
            tri1.p = [pedge1, pin1, pin2];
            tri1.t = [tedge1, tin1, tin2];
            var tri2 = new Triangle(this);
            tri2.p = [pedge1, pin2, pedge2];
            tri2.t = [tedge1, tin2, tedge2];
            return [tri1, tri2];
        }
    }
};

class Camera {
    constructor(pos) {
        this.pos = new V(pos).fix(3);
        this.rotation = new V(0, 0);
        this.worldToCamSpaceTransform = Matrix.identity(4);
        this.fov = 90;
        this.znear = 0.01;
        this.zfar = 1000;
        this.speed = 0.1;
        this.skyColor = [0, 0, 0];
        this.lightDirection = new V([1, 2, 0.5]).normalize();
        this.ambientLight = 0.5;
        this.projectionMatrix = new Matrix(3, [
            1/tan(this.fov*π/360)*canvas.height/canvas.width, 0, 0,
            0, 1/tan(this.fov*π/360), 0,
            0, 0, 1
        ]);
        this.rearrangeMatrix = new Matrix(3, [
            -1, 0, 0,
            0, -1, 0,
            0, 0, 1
        ]);
        this.imageData = ctx.createImageData(canvas.width, canvas.height);
        for (var i = 0; i < this.imageData.data.length; i += 4) this.imageData.data[i+3] = 255;
        this.zbuffer = new Float32Array(this.imageData.width*this.imageData.height);
    }
    getXRotationMatrix() {
        return new Matrix(3, [
            cos(this.rotation.x), 0, sin(this.rotation.x),
            0, 1, 0,
            -sin(this.rotation.x), 0, cos(this.rotation.x)
        ]);
    }
    getYRotationMatrix() {
        return new Matrix(3, [
            1, 0, 0,
            0, cos(this.rotation.y), sin(this.rotation.y),
            0, -sin(this.rotation.y), cos(this.rotation.y)
        ]);
    }
    getLookVector() {
        return new V(-sin(this.rotation.x)*cos(this.rotation.y), -sin(this.rotation.y), cos(this.rotation.x)*cos(this.rotation.y))
    }
    updateWorldToCamSpaceTransform() {
        this.worldToCamSpaceTransform = this.rearrangeMatrix.mult(this.getYRotationMatrix()).mult(this.getXRotationMatrix());
    }
    setRotation(dx, dy) {
        this.rotation.c = [wrap(dx, -π, π), bind(dy, -π/2, π/2)];
        this.updateWorldToCamSpaceTransform();
    }
    setPixel(x, y, color) {
        var i = (y * this.imageData.heigth + x) * 4;
        imageData.data[i] = color[0];
        imageData.data[i+1] = color[1];
        imageData.data[i+2] = color[2];
        imageData.data[i+3] = 255;
    }
    async texTriangle(tri) {
        // sort points from least y (p1) to most y (p3)
        var p1 = new V(tri.p[0]),   p2 = new V(tri.p[1]),   p3 = new V(tri.p[2]);
        var t1 = new V(tri.t[0]),   t2 = new V(tri.t[1]),   t3 = new V(tri.t[2]);
        var t, tt;
        if (p1.y > p3.y) {
            t = p1, p1 = p3, p3 = t;
            tt = t1, t1 = t3, t3 = tt;
        }
        if (p1.y > p2.y) {
            t = p1, p1 = p2, p2 = t;
            tt = t1, t1 = t2, t2 = tt;
        }
        if (p2.y > p3.y) {
            t = p2, p2 = p3, p3 = t;
            tt = t2, t2 = t3, t3 = tt;
        }

        var ycorrect = [        // These make sure all incremented values based on y are aligned to y on the decimal, not just the integer
            -(p1.y % 1),    // We need this because we're not using interpolation
            -(p2.y % 1)     // for an incremented value A, begin at Ainitial + dA * ycorrect{point}
        ];                  // note this setup requires putting increments before calculations in the loop

        var dxe = (p3.x - p1.x)/(p3.y - p1.y);
        // example of correction usage:
        var xe = p1.x + dxe * ycorrect[0];

        var dte = t3.sub(t1).mult(1/(p3.y-p1.y)); // change in te per row advance
        var te = t1.add(dte.mult(ycorrect[0])); // t at end of current row

        var pupper = [p1, p2]; // do the upper half and lower half together in a 2-time loop
        var plower = [p2, p3]; // these are the only values that differ
        var tupper = [t1, t2];
        var tlower = [t2, t3];
        for (var a = 0; a < 2; a++) if (pupper[a].y < plower[a].y - 0.1) {
            var dxs = (plower[a].x - pupper[a].x)/(plower[a].y - pupper[a].y);
            var xs = pupper[a].x + dxs * ycorrect[a];

            var dts = tlower[a].sub(tupper[a]).mult(1/(plower[a].y - pupper[a].y)); // change in ts per row advance
            var ts = tupper[a].add(dts.mult(ycorrect[a])); // t at start of current row

            for (var y = floor(pupper[a].y + SMOL); y < floor(plower[a].y); y++) { // row advance
                xs += dxs;
                xe += dxe;
                ts = ts.add(dts);
                te = te.add(dte);

                var dt = te.sub(ts).mult(1/(xe - xs)); // change in t per x++
                // this is probably constant across all the rows but that's ok

                // once again we are rounding to plot pixels so we need to get the decimal texture positions aligned correctly in the row
                var xcorrect = -(xs % 1);

                // make sure that we are moving left to right, since x++ only goes one direction
                if (xs <= xe) { // forwards case
                    var xsl = floor(xs), xel = floor(xe)
                    var t = ts.add(dt.mult(xcorrect)); // current texture space position
                } else { // backwards case
                    var xsl = floor(xe), xel = floor(xs);
                    var t = te.add(dt.mult(-xcorrect));
                }
                
                var iz = y * this.imageData.width + xsl - 1;
                var i = iz * 4;
                for (var x = xsl; x < xel; x++) {
                    iz++, i += 4;
                    t.x += dt.x, t.y += dt.y, t.w += dt.w;
                    if (this.zbuffer[iz] > t.w) continue;
                    this.zbuffer[iz] = t.w;
                    var color = sampleTexture(bind(t.u / t.w, SMOL, 1-SMOL), bind(t.v / t.w, SMOL, 1-SMOL), tri.textureIndex);
                    this.imageData.data[i] = color[0] * tri.shade;
                    this.imageData.data[i+1] = color[1] * tri.shade;
                    this.imageData.data[i+2] = color[2] * tri.shade;
                }
            }
        }
    }
};

function loadObj(objFile, textureIndex, offset=[0, 0, 0], overwrite=true) {
    console.log("Loading .obj file...");
    if (overwrite) triangles = [];
    offset = new V(offset).fix(3);
    var file = objFile.split("\n");
    var vertices = [];
    var texVertices = [];
    var tris = [];
    for (var line in file) {
        if (file[line] == "") continue;
        var data = file[line].split(" ");
        if (data[0] == "v") {
            vertices.push([parseFloat(data[1]), parseFloat(data[2]), parseFloat(data[3])]);
        } else if (data[0] == "vt") {
            texVertices.push([parseFloat(data[1]), parseFloat(data[2])]);
        } else if (data[0] == "f") {
            for (var a in data) data[a] = data[a].split("/");
            tris.push([parseInt(data[1][0])-1, parseInt(data[2][0])-1, parseInt(data[3][0])-1, parseInt(data[1][1])-1, parseInt(data[2][1])-1, parseInt(data[3][1])-1]);
            if (data[4]) tris.push([parseInt(data[1][0])-1, parseInt(data[3][0])-1, parseInt(data[4][0])-1, parseInt(data[1][1])-1, parseInt(data[3][1])-1, parseInt(data[4][1])-1]);
        }
    }
    for (var a = 0; a < tris.length; a++) {
        triangles.push(new Triangle(new V(vertices[tris[a][0]]).add(offset), new V(vertices[tris[a][1]]).add(offset), new V(vertices[tris[a][2]]).add(offset)));
        triangles[triangles.length-1].t = [new V(texVertices[tris[a][3]]), new V(texVertices[tris[a][4]]), new V(texVertices[tris[a][5]])];
        triangles[triangles.length-1].textureIndex = textureIndex;
    }
};

function scatterObjects(nTris, nCopies, range) {
    console.log("Copying object around...");
    for (var b = 0; b < nCopies; b++) {
        var v = new V(random.float(-range, range), random.float(-range, range), random.float(-range, range));
        var axis = new V(random.float(-1, 1), random.float(-1, 1), random.float(-1, 1)).normalize();
        var angle = random.float(2*π);
        for (var a = 0; a < nTris; a++) triangles.push(triangles[a].applyTransform(Matrix.makeRotationMatrix(angle, axis)).add(v));
    }
};

function calcLighting(lightDirection=cam.lightDirection, ambientLight=cam.ambientLight, start=0, end=triangles.length) {
    console.log("Calculating lighting...");
    lightDirection = new V(lightDirection).normalize();
    for (var a = start; a < end; a++) triangles[a].shade = max(triangles[a].getNormal().dot(lightDirection), 0) * (1 - ambientLight) + ambientLight;
};

function sampleTexture(u, v, index) {
    if (index >= textureDatas.length) {
        if (u < 0 || v < 0 || u >= 1 || v >= 1) return [255, 0, 0];
        if ((u < 0.5) + (v < 0.5) == 1) return [255, 0, 255];
        else return [0, 0, 0];
    };
    var x = floor(u * textureDatas[index].width);
    var y = floor((1-v) * textureDatas[index].height);
    if (x < 0 || y < 0 || x >= textureDatas[index].width || y >= textureDatas[index].height) return [255, 0, 0];
    var i = (y * textureDatas[index].width + x) * 4;
    return [
        textureDatas[index].data[i],
        textureDatas[index].data[i+1],
        textureDatas[index].data[i+2]
    ];
};


window.addEventListener("keydown", function(event) {
    switch (event.keyCode) {
    case 49: // 1
        loadObj(cube_obj, 1);
        calcLighting();
        cam.skyColor = [0, 0, 0];
        break;
    case 50: // 2
        loadObj(cube_obj, 1);
        scatterObjects(triangles.length, 100, 10);
        calcLighting();
        cam.skyColor = [0, 0, 0];
        break;
    case 51: // 3
        loadObj(teapot_obj, 1);
        calcLighting();
        cam.skyColor = [31, 31, 31];
        break;
    case 52: // 4
        loadObj(level_obj, 0);
        calcLighting();
        cam.skyColor = [177, 231, 240];
        break;
    case 69: // e
        var pos = cam.pos.add(cam.getLookVector().mult(5));
        loadObj(cube_obj, 1, pos, false);
        calcLighting(cam.lightDirection, cam.ambientLight, triangles.length-12);
        break;
    case 82: // r
        cam.pos = new V(0, 0, -5);
        cam.speed = 5;
        break;
    case 76: // l
        cam.lightDirection = cam.getLookVector();
        calcLighting();
        break;
    case 219: // [
        cam.ambientLight -= 0.05;
        if (cam.ambientLight < 0) cam.ambientLight = 0;
        calcLighting();
        break;
    case 221: // [
        cam.ambientLight += 0.05;
        if (cam.ambientLight > 1) cam.ambientLight = 1;
        calcLighting();
        break;
    }
});



console.log("Loading textures...");

var numTextures = 2;
var textureLoadedCount = 0;
var textureImages = [];
var textureDatas = [];

var textureCanvas = document.createElement("canvas");
var textureCtx = textureCanvas.getContext("2d");

for (var a = 0; a < base64textures.length; a++) {
    var textureImage = new Image();
    textureImage.src = base64textures[a];
    textureImages.push(textureImage);
    textureImage.onload = function() {
        textureLoadedCount++;

        // when all textures are loaded
        if (textureLoadedCount >= numTextures) for (var a = 0; a < numTextures; a++) {
            textureCanvas.width = textureImages[a].width;
            textureCanvas.height = textureImages[a].height;
            textureCtx.drawImage(textureImages[a], 0, 0);
            textureDatas.push(textureCtx.getImageData(0, 0, textureCanvas.width, textureCanvas.height));
        }
    };
}

var triangles = [];

var cam = new Camera([0, 0, -5]);
cam.speed = 5;

loadObj(level_obj, 0);
calcLighting();
cam.skyColor = [177, 231, 240];


var fps = new FPSMeter(7);

function draw() {
    requestAnimationFrame(draw);
    fps.frame();

    cam.setRotation((mouse.x/canvas.width*4-2)*π, (mouse.y/canvas.height-0.5)*π);

    if (keys[32] && !keys[16]) cam.pos.y += cam.speed / fps.fps;
    else if (keys[16] && !keys[32]) cam.pos.y -= cam.speed / fps.fps;
    if (keys[87] && !keys[83]) {
        cam.pos.x += cam.speed * -sin(cam.rotation.x) / fps.fps;
        cam.pos.z += cam.speed * cos(cam.rotation.x) / fps.fps;
    } else if (keys[83] && !keys[87]) {
        cam.pos.x -= cam.speed * -sin(cam.rotation.x) / fps.fps;
        cam.pos.z -= cam.speed * cos(cam.rotation.x) / fps.fps;
    }
    if (keys[65] && !keys[68]) {
        cam.pos.x += cam.speed * cos(cam.rotation.x) / fps.fps;
        cam.pos.z += cam.speed * sin(cam.rotation.x) / fps.fps;
    } else if (keys[68] && !keys[65]) {
        cam.pos.x -= cam.speed * cos(cam.rotation.x) / fps.fps;
        cam.pos.z -= cam.speed * sin(cam.rotation.x) / fps.fps;
    }

    if (keys[187] && !keys[189]) cam.speed *= 1.05;
    else if (keys[189] && !keys[187]) cam.speed /= 1.05;
    
    for (var i = 0; i < cam.imageData.data.length/4; i++) {
        cam.imageData.data[4*i] = cam.skyColor[0];
        cam.imageData.data[4*i+1] = cam.skyColor[1];
        cam.imageData.data[4*i+2] = cam.skyColor[2];
        cam.imageData.data[4*i+3] = 255;
        cam.zbuffer[i] = 0;
    }

    var tris = [];
    for (var a in triangles) {
        // test if visible
        if (cam.pos.sub(triangles[a].p[0]).dot(triangles[a].getNormal()) <= 0) continue;
        // list cam triangles and projected triangles
        var camTri = triangles[a].sub(cam.pos).applyTransform(cam.worldToCamSpaceTransform);
        //clip on near plane
        //console.log("before", camTri.p[0].c, camTri.p[1].c, camTri.p[2].c);
        var clippedCamTris = camTri.clip(new V(0, 0, 1), new V(0, 0, cam.znear));
        //if (clippedCamTris[0]) console.log("after", clippedCamTris[0].p[0].c, clippedCamTris[0].p[1].c, clippedCamTris[0].p[2].c);

        for (var a in clippedCamTris) tris.push(clippedCamTris[a].applyTransform(cam.projectionMatrix));
    }
    // painter's method, not using now in favor of zbuffering
    //tris.sort((a, b) => b.p[0].z + b.p[1].z + b.p[2].z - (a.p[0].z + a.p[1].z + a.p[2].z));
    // draw
    let promiseList = [];
    for (var a = 0; a < tris.length; a++) {
        let list = tris[a].GPUdraw();
        promiseList = [...promiseList, ...list];
    }
    Promise.all(promiseList).then(function() {
        ctx.putImageData(cam.imageData, 0, 0);
        
        if (max(cam.skyColor[0], cam.skyColor[1], cam.skyColor[2]) < 128) ctx.fillStyle = "#ffffff";
        else ctx.fillStyle = "#000000";
        ctx.font = "16px Arial";
        ctx.fillText(roundTo(fps.fps, 1).toString() + " FPS", 20, canvas.height - 20);
    });

};

console.log("Beginning Main loop");
draw();