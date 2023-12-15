/*
General purpose math and management stuff for general use.
Removes annoying Math namespace (π works), new math functions, event scheduling, n-dimensional vectors, matrices, 2d frames for nested coordinate references, and a bit of mouse and keyboard input precode.
*/

var abs = Math.abs, sin = Math.sin, cos = Math.cos, tan = Math.tan, asin = Math.asin, acos = Math.acos, atan = Math.atan, atan2 = Math.atan2, floor = Math.floor, ceil = Math.ceil, round = Math.round, sign = Math.sign, sqrt = Math.sqrt, cbrt = Math.cbrt, min = Math.min, max = Math.max;

var random = {
	int: function(n1=2, n2=0) { return Math.floor(Math.random() * (n2 - n1)) + n1; },
	float: function(n1=1, n2=0) { return Math.random() * (n2 - n1) + n1; },
	choose: function(list) { return list[Math.floor(Math.random() * list.length)]; }
};

function roundTo(n, d) {
	return Math.round(n/d)*d;
};

const E = Math.E, PI = π = Math.PI, SQRT2 = Math.SQRT2;

function lerp(min, max, t) { return t * (max - min) + min; };
function prel(min, max, t) { return (t - min) / (max - min); };
function cubicLerp(min, max, t) {
    t = -2 * t * t * t + 3 * t * t;
    return min + t * (max - min);
};
function sineLerp(min, max, t) {
	t = (1 - Math.cos(Math.PI * t)) / 2;
	return min + t * (max - min);
};
function bind(x, m1, m2) {
	if (m1 < m2) return Math.min(m2, Math.max(m1, x));
	else return Math.min(m1, Math.max(m2, x));
};
function wrap(x, m1, m2) {
	if (m2 < m1) { var mt = m1; m1 = m2; m2 = mt; };
	return lerp(m1, m2, prel(m1, m2, x) % 1);
};
function integrate(f, a, b, steps=10000) {
	var sum = 0;
	for (var i = a + (b-a)/(steps*2); i < b; i += (b-a)/steps) sum += f(i);
	return sum * (b-a)/steps;
};

class EventSchedule {
	constructor(functions=[]) {
		this.targetFPS = 60;
		this.time1 = performance.now();
		this.functions = functions;
		/*
		functions = [
			{
				function: function to repeat,
				type: ("%", "count", or "to end"),
				time: % of computing time or number of times to run
			}, ...
		]
		*/
	}
	doFunctions() {
		var opTime = 1/this.targetFPS - (performance.now() - this.time1);
		this.time1 = performance.now();
		var endAll = this.time1 + opTime;

		main:
		for (var a = 0; a < this.functions.length; a++) {
			switch (this.functions[a].type) {
				case "%":
					var endThis = performance.now() + opTime * this.functions[a].time;
					while (performance.now() < endThis) {
						if (performance.now() >= endAll) break main;
						this.functions[a].function();
					}
					break;
				case "count":
					for (var b = 0; b < this.functions[a].time; b++) {
						if (performance.now() >= endAll) break main;
						this.functions[a].function();
					}
					break;
				case "to end":
					while (true) {
						if (performance.now() >= endAll) break main;
						this.functions[a].function();
					}
			}
		}
	}
};

class FPSMeter {
	constructor(avgSpread=3) {
		this.t = performance.now();
		this.fpsList = [];
		for (var a = 0; a < max(avgSpread, 1); a++) this.fpsList.push(0);
	};
	frame() {
		var t2 = performance.now();
		this.fpsList.push(1000 / (t2 - this.t1));
		this.fpsList.shift();
		this.t1 = t2;
	};
	get fps() {
		var sum = 0;
		for (var a in this.fpsList) sum += this.fpsList[a];
		return sum / this.fpsList.length;
	}
};

class V {
	constructor(c=[0, 0]) {
		this.c = [];
		if (c instanceof V) for (var a = 0; a < c.c.length; a++) this.c[a] = c.c[a];
		else if (c instanceof Array) for (var a = 0; a < c.length; a++) this.c[a] = c[a];
		else for (var a = 0; a < arguments.length; a++) this.c.push(arguments[a]);
	};
	get x() { return this.c[V.letterMap.x]; };
	get y() { return this.c[V.letterMap.y]; };
	get z() { return this.c[V.letterMap.z]; };
	get w() { return this.c[V.letterMap.w]; };
	get r() { return this.c[V.letterMap.r]; };
	get i() { return this.c[V.letterMap.i]; };
	get j() { return this.c[V.letterMap.j]; };
	get k() { return this.c[V.letterMap.k]; };
	get u() { return this.c[V.letterMap.u]; };
	get v() { return this.c[V.letterMap.v]; };
	set x(n) { this.c[V.letterMap.x] = n; };
	set y(n) { this.c[V.letterMap.y] = n; };
	set z(n) { this.c[V.letterMap.z] = n; };
	set w(n) { this.c[V.letterMap.w] = n; };
	set r(n) { this.c[V.letterMap.r] = n; };
	set i(n) { this.c[V.letterMap.i] = n; };
	set j(n) { this.c[V.letterMap.j] = n; };
	set k(n) { this.c[V.letterMap.k] = n; };
	set u(n) { this.c[V.letterMap.u] = n; };
	set v(n) { this.c[V.letterMap.v] = n; };
	static letterMap = { x: 0, y: 1, z: 2, w: 3, r: 0, i: 1, j: 2, k: 3, u: 0, v: 1 };
	get dim() { return this.c.length; };
	set dim(dim) {
		var c = [];
		for (var a = 0; a < dim; a++) c.push(this.c[a] || 0);
		this.c = c;
	};
	setDim(dim, fill=0) {
		var c = [];
		for (var a = 0; a < dim; a++) {
			if (a < this.dim) c.push(this.c[a]);
			else c.push(fill);
		}
		this.c = c;
		return this;
	};
	fix(dim, fill=0) {
		var c = [];
		for (var a = 0; a < dim; a++) {
			if (a < this.dim) c.push(this.c[a]);
			else c.push(fill);
		}
		this.c = c;
		return this;
	}
	
	get abs2() { return this.dot(this); };
	get abs() { return sqrt(this.abs2); };
	add(v) {
		var c = [];
		for (var a = 0; a < this.c.length; a++) c.push(this.c[a] + (v.c[a] || 0));
		return new V(c);
	};
	sub(v) {
		var c = [];
		for (var a = 0; a < this.c.length; a++) c.push(this.c[a] - v.c[a]);
		return new V(c);
	};
	mult(s) {
		if (s instanceof V) {
			var q1 = new V(this);
			var q2 = new V(s);
			q1.dim = 4;
			q2.dim = 4;
			return new V(
				q1.r * q2.r - q1.i * q2.i - q1.j * q2.j - q1.k * q2.k,
				q1.r * q2.i + q1.i * q2.r + q1.j * q2.k - q1.k * q2.j,
				q1.r * q2.j - q1.i * q2.k + q1.j * q2.r + q1.k * q2.i,
				q1.r * q2.k + q1.i * q2.j - q1.j * q2.i + q1.k * q2.r
			);
		} else {
			var c = [];
			for (var a = 0; a < this.dim; a++) c.push(this.c[a] * s);
			return new V(c);
		}
	};
	dot(v) {
		var total = 0;
		for (var a = 0; a < this.dim && a < v.dim; a++) total += this.c[a] * v.c[a];
		return total;
	};
	cross(v) {
		var v1 = new V(this), v2 = new V(v);
		v1.dim = 3; v2.dim = 3;
		return new V(v1.y * v2.z - v1.z * v2.y, v1.z * v2.x - v1.x * v2.z, v1.x * v2.y - v1.y * v2.x);
	};
	normalize() { this.c = this.mult(1/this.abs).c; return this; };
	angle(v) { return acos(this.dot(v) / (this.abs * v.abs)); };
	rotate(angle=0, axis=new V(0, 0, 1)) {
		if (this.dim === 2) return new V(this.x * cos(angle) - this.y * sin(angle), this.y * cos(angle) + this.x * sin(angle));
		else if (this.dim === 3) {
			var q = new V(cos(angle / 2), sin(angle / 2) * axis.x, sin(angle / 2) * axis.y, sin(angle / 2) * axis.z);
			var p = q.mult(new V(0, this.x, this.y, this.z)).mult(new V(q.r, -q.i, -q.j, -q.k));
			return new V(p.i, p.j, p.k);
		}
	};
	moveHere() { ctx.moveTo(this.c[0], this.c[1]); };
	lineHere() { ctx.lineTo(this.c[0], this.c[1]); };
	applyTransform(matrix) {
		return new V(matrix.mult(new Matrix([matrix.dim.y, 1], this.c)).getCol());
	};
	applyInverseTransform(matrix, offset=new V()) {
		if (matrix instanceof Matrix) return new V(matrix.inverse.mult(new Matrix([this.dim, 1], this.sub(offset).c)).getCol());
		else if (matrix.matrix instanceof Matrix) return new V(matrix.matrix.inverse.mult(new Matrix([this.dim, 1], this.sub(matrix.offset).c)).getCol());
	};
	static lerp(v1, v2, t) {
		return v2.sub(v1).mult(t).add(v1);
	};
};



class Matrix {
	constructor(dim=2, d=[]) {
		this.d = [];
		if (dim instanceof Matrix) Object.assign(this, dim);
		else {
			this.dim = new V(dim).fix(2, dim[0] || dim.x || dim);
			if (d.length === 0) {
				for (var x = 0; x < this.dim.x; x++) {
					this.d[x] = [];
					for (var y = 0; y < this.dim.y; y++) {
						this.d[x][y] = 0;
					}
				}
			} else if (typeof d[0] === "number") {
				var c = 0;
				for (var x = 0; x < this.dim.x; x++) {
					this.d[x] = [];
					for (var y = 0; y < this.dim.y; y++) {
						this.d[x][y] = d[c] || 0;
						c++;
					}
				}
			} else if (d[0] instanceof Array) {
				for (var x = 0; x < this.dim.x; x++) {
					this.d[x] = [];
					for (var y = 0; y < this.dim.y; y++) {
						this.d[x][y] = d[x][y] || 0;
					}
				}
			}
		}
	};
	getRow(x=0) {
		return this.d[x];
	};
	getCol(y=0) {
		var array = [];
		for (var x = 0; x < this.dim.x; x++) array.push(this.d[x][y]);
		return array;
	};
	setRow(x, array) {
		if (array instanceof V) array = array.c;
		for (var y = 0; y < this.dim.y; y++) this.d[x][y] = array[y] || 0;
	};
	setCol(y, array) {
		if (array instanceof V) array = array.c;
		for (var x = 0; x < this.dim.x; x++) this.d[x][y] = array[x] || 0;
	};
	static identity(size) {
		var i = new Matrix([size, size]);
		for (var a = 0; a < i.dim.x; a++) i.d[a][a] = 1;
		return i;
	};
	add(m) {
		if (this.dim.x !== m.dim.x || this.dim.y !== m.dim.y) return;
		var newData = [];
		for (var x = 0; x < this.dim.x; x++) {
			newData[x] = [];
			for (var y = 0; y < this.dim.y; y++) {
				newData[x][y] = this.d[x][y] + m.d[x][y];
			}
		}
		return new Matrix(this.dim, newData);
	};
	mult(m) {
		var newData = [];
		if (m instanceof Matrix) {
			if (this.dim.y !== m.dim.x) return;
			var newDim = new V(this.dim.x, m.dim.y);
			for (var x = 0; x < newDim.x; x++) {
				newData[x] = [];
				for (var y = 0; y < newDim.y; y++) {
					newData[x][y] = new V(this.getRow(x)).dot(new V(m.getCol(y)));
				}
			}
			return new Matrix(newDim, newData);
		} else {
			for (var x = 0; x < this.dim.x; x++) {
				newData[x] = [];
				for (var y = 0; y < this.dim.y; y++) {
					newData[x][y] = this.d[x][y] * m;
				}
			}
			return new Matrix(this.dim, newData);
		}
	};
	minor(x, y) {
		var newDim = new V(this.dim.x - 1, this.dim.y - 1);
		var newData = [];
		for (var X = 0; X < this.dim.x; X++) if (X !== x) {
			newData[X-(X>x)] = [];
			for (var Y = 0; Y < this.dim.y; Y++) if (Y !== y) {
				newData[X-(X>x)][Y-(Y>y)] = this.d[X][Y];
			}
		}
		return new Matrix(newDim, newData);
	};
	signed(x, y) {
		if ((x + y) % 2 === 0) return this.d[x][y];
		else return -this.d[x][y];
	};
	cofactor(x, y) {
		if ((x + y) % 2 === 0) return this.minor(x, y);
		else return -this.minor(x, y);
	};
	get matrixOfMinors() {
		var newData = [];
		for (var x = 0; x < this.dim.x; x++) {
			newData[x] = [];
			for (var y = 0; y < this.dim.y; y++) {
				newData[x][y] = this.minor(x, y).determinant;
			}
		}
		return new Matrix(this.dim, newData);
	};
	get matrixOfCofactors() {
		var m = this.matrixOfMinors;
		for (var x = 0; x < this.dim.x; x++) {
			for (var y = 0; y < this.dim.y; y++) {
				m.d[x][y] = m.signed(x, y);
			}
		}
		return m;
	};
	get transposed() {
		var m = new Matrix(this.dim);
		for (var x = 0; x < this.dim.x; x++) {
			m.setCol(this.getRow(x));
		}
		return m;
	};
	get adjoint() {
		return this.matrixOfCofactors.transposed;
	};
	get determinant() {
		if (this.dim.x !== this.dim.y) return;
		switch (this.dim.x) {
			case 1: return this.d[0][0];
			case 2: return this.d[0][0]*this.d[1][1] - this.d[0][1]*this.d[1][0];
			case 3:
				var d = this.d;
				return d[0][0]*d[1][1]*d[2][2] + d[0][1]*d[1][2]*d[2][0] + d[0][2]*d[1][0]*d[2][1] - d[0][0]*d[1][2]*d[2][1] - d[0][1]*d[1][0]*d[2][2] - d[0][2]*d[1][1]*d[2][0];
		}
		if (this.dim.x >= 4) {
			var sum = 0;
			for (var n = 0; n < this.dim.x; n++) {
				sum += this.signed(n, 0) * this.minor(n, 0).determinant;
			}
			return sum;
		}
	};
	get inverse() {
		if (this.dim.x !== this.dim.y) return;
		if (this.determinant === 0) console.error("Matrix.inverse Error: No solution, determinant is zero.");
		switch (this.dim.x) {
			case 1: return new Matrix([1, 1], [1 / this.d[0][0]]);
			case 2: return new Matrix([2, 2], [this.d[1][1], -this.d[0][1], -this.d[1][0], this.d[0][0]]).mult(1/this.determinant);
			case 3:
				var d = this.d;
				var m = new Matrix([3, 3], [
					d[1][1]*d[2][2]-d[2][1]*d[1][2],
					d[2][1]*d[0][2]-d[0][1]*d[2][2],
					d[0][1]*d[1][2]-d[1][1]*d[0][2],
					d[2][0]*d[1][2]-d[1][0]*d[2][2],
					d[0][0]*d[2][2]-d[2][0]*d[0][2],
					d[1][0]*d[0][2]-d[0][0]*d[1][2],
					d[1][0]*d[2][1]-d[2][0]*d[1][1],
					d[2][0]*d[0][1]-d[0][0]*d[2][1],
					d[0][0]*d[1][1]-d[1][0]*d[0][1]
				]);
				return m.mult(1/this.determinant);
		}
		if (this.dim.x >= 4) {
			return this.adjoint.mult(1/this.determinant);
		}
	};
	static makeRotationMatrix(angle=0, axis=[0, 0, 1]) {
		axis = new V(axis).fix(3);
		// I've expanded the formulas to reduce a lot of 0 and 1 multiplications in hopes of better performance.
		var vx = new V(-sin(angle/2) * axis.x, cos(angle/2), sin(angle/2) * axis.z, -sin(angle/2) * axis.y).mult(new V(cos(angle/2), -sin(angle/2) * axis.x, -sin(angle/2) * axis.y, -sin(angle/2) * axis.z));
		var vy = new V(-sin(angle/2) * axis.y, -sin(angle/2) * axis.z, cos(angle/2), sin(angle/2) * axis.x).mult(new V(cos(angle/2), -sin(angle/2) * axis.x, -sin(angle/2) * axis.y, -sin(angle/2) * axis.z));
		var vz = new V(-sin(angle / 2) * axis.z, sin(angle / 2) * axis.y, -sin(angle / 2) * axis.x, cos(angle / 2)).mult(new V(cos(angle / 2), -sin(angle / 2) * axis.x, -sin(angle / 2) * axis.y, -sin(angle / 2) * axis.z));
	
		return new Matrix([3, 3], [
			vx.i, vy.i, vz.i,
			vx.j, vy.j, vz.j,
			vx.k, vy.k, vz.k
		])
	};
};

class Frame {
	constructor(parent=null, offset=new V(), scale=new V(1, 1)) {
		this.parent = parent;
		if (this.parent == null) {
			this.offset = new V();
			this.matrix = Matrix.identity(2);
		} else {
			this.offset = new V(offset).fix(2);
			this.matrix = new Matrix([2, 2]);
			this.matrix.d[0][0] = scale.x || scale[0] || scale;
			this.matrix.d[1][1] = scale.y || scale[1] || scale;
		}
	};
	zoom(z, v=new V()) {
		// v is point in frame's reference
		this.offset.add(this.outpoint(v, this.parent).mult(1 - z));
		this.matrix = this.matrix.mult(z);
	};
	collectTransform(frame=null) {
		var transform = {
			matrix: new Matrix(this.matrix),
			offset: new V(this.offset)
		};
		for (var currentFrame = this.parent; currentFrame != frame; currentFrame = currentFrame.parent) {
			transform.matrix = currentFrame.matrix.mult(transform.matrix);
			transform.offset = new V(currentFrame.matrix.mult(new Matrix([2, 1], transform.offset.c)).getCol()).add(currentFrame.offset);
		}
		return transform;
	};
	outpoint(v, outframe=null) {
		v = new V(v).setDim(2);
		return v.applyTransform(this.collectTransform(outframe));
	};
	inpoint(v, inframe=null) {
		v = new V(v).fix(2);
		var transform = this.collectTransform(inframe);
		if (transform.matrix.determinant === 0) console.error("Frame.inpoint error: transform determinant is 0", transform.matrix);
		else return v.applyInverseTransform(transform);
	};
	useTransform(ctx) {
		ctx.resetTransform();
		var t = this.collectTransform();
		ctx.transform(t.matrix.d[0][0], t.matrix.d[1][0], t.matrix.d[0][1], t.matrix.d[1][1], t.offset.x, t.offset.y);
	};
	moveTo(v) {
		if (typeof v === "number") this.outpoint(new V(Array.from(arguments))).moveHere();
		else if (v instanceof V) this.outpoint(v).moveHere();
	};
	lineTo(v) {
		if (typeof v === "number") this.outpoint(new V(Array.from(arguments))).lineHere();
		else if (v instanceof V) this.outpoint(v).lineHere();
	};
};



const mouse = Object.assign({
    l: false,
	m: false,
	r: false,
    drag: {
        l: { start: new V(), end: new V() },
        m: { start: new V(), end: new V() },
        r: { start: new V(), end: new V() }
    }
}, new V(0, 0));
mouse.__proto__ = new V().__proto__;


window.addEventListener("mousemove", function(event) {
	mouse.x = event.x;
	mouse.y = event.y;
	if (mouse.l) mouse.drag.l.end = new V(mouse);
    if (mouse.m) mouse.drag.m.end = new V(mouse);
    if (mouse.r) mouse.drag.r.end = new V(mouse);
});

window.addEventListener("mousedown", function(event) {
	switch (event.button) {
	case 0:
		mouse.l = true;
		mouse.drag.l.start = new V(mouse);
		mouse.drag.l.end = new V(mouse);
		break;
	case 1:
        mouse.m = true;
		mouse.drag.m.start = new V(mouse);
		mouse.drag.m.end = new V(mouse);
		break;
	case 2:
        mouse.r = true;
        mouse.drag.r.start = new V(mouse);
		mouse.drag.r.end = new V(mouse);
		break;
	}
});

window.addEventListener("mouseup", function(event) {
	switch (event.button) {
		case 0:
			mouse.l = false;
			break;
		case 1:
			mouse.m = false;
			break;
		case 2:
			mouse.r = false;
			break;
	}
});

var keys = [];
for (var x = 0; x < 256; x++) { keys[x] = false; }
window.addEventListener("keydown", function(event) { keys[event.which || event.keyCode] = true; });
window.addEventListener("keyup", function(event) { keys[event.which || event.keyCode] = false; });






