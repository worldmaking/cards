let assert = require ("assert");

// see https://github.com/worldmaking/cards/wiki/List-of-Operational-Transforms

let deltas = [
	[
	  { op:"newnode", path:"a", kind:"noise", pos:[10,10] }, 
	  { op:"newnode", path:"a.signal", kind:"outlet" }, 
	],
	[
	  { op:"newnode", path:"b", kind:"dac", pos:[10,50] },
	  { op:"newnode", path:"b.source", kind:"inlet" }, 
	],
	{ op:"connect", paths: ["a.signal", "b.source"] },
	{ op:"newnode", path:"child", kind:"group", pos:[50,50] },
	[
	  { op:"newnode", path:"child.a", kind:"beep", pos:[10,10] },
	  { op:"newnode", path:"child.a.signal", kind:"outlet" }
	], 
	{ op:"connect", paths: ["child.a.signal", "b"] }
];

function copyProps(src, dst) {
	for (let k in src) {
		if (k == "op" || k == "path") continue;

		// TODO: recursive objects?
		dst[k] = src[k];
	}
	return dst;
}

function findPath(root, path) {
	let steps = path.split(".");
	let n = root;
	for (let k in steps) {
		assert(n[k], "failed to find path");
		n = n[k];
	}
	return n;
}

function findPathContainer(root, path) {
	let steps = path.split(".");
	let last = steps.pop();
	let n = root;
	for (let k of steps) {
		assert(n[k], "failed to find path");
		n = n[k];
	}
	return [n, last];
}

function makePath(root, path) {
	let steps = path.split(".");
	let last = steps.pop();
	let n = root;
	for (let k of steps) {
		assert(n[k], "failed to find path");
		n = n[k];
	}
	assert(!n[last], "path already exists")
	let o = { _props: {} };
	n[last] = o;
	return o;
}

function inverseDelta(delta) {
	if (Array.isArray(delta)) {
		let res = [];
		// invert in reverse order:
		for (let i=delta.length-1; i>=0; i--) {
			res.push(inverseDelta(delta[i]));
		}
		return res;
	} else {
		switch (delta.op) {
			case "newnode": {
				let d = {
					op: "delnode",
					path: delta.path,
				};
				copyProps(delta, d);
				return d;
			} break;
			case "delnode": {
				let d = {
					op: "newnode",
					path: delta.path,
				};
				copyProps(delta, d);
				return d;
			} break;
			
			case "connect": {
				return {
					op: "disconnect",
					paths: [ delta.paths[0], delta.paths[1] ]
				}
			} break;
			case "disconnect": {
				return {
					op: "connect",
					paths: [ delta.paths[0], delta.paths[1] ]
				}
			} break;
		}
	}
}

function applyDeltasToGraph(graph, deltas) {
	for (let d of deltas) {
		if (Array.isArray(d)) {
			applyDeltasToGraph(graph, d);
		} else {
			switch (d.op) {
				case "newnode": {
					let o = makePath(graph.nodes, d.path);
					copyProps(d, o._props);
				} break;
				case "delnode": {
					let [ctr, name] = findPathContainer(graph.nodes, d.path);
					let o = ctr[name];
					assert(o, "delnode failed: path not found");
					// assert o._props match delta props
					for (let k in o._props) {
						assert(o._props[k] == d[k], "delnode failed; properties do not match");
					}
					delete ctr[name];
				} break;

				case "connect": {
					// TODO: assert connection does not yet exist
					assert(undefined == graph.arcs.find(e => e[0]==d.paths[0] && e[1]==d.paths[1]), "connect failed: arc already exists");

					graph.arcs.push([ d.paths[0], d.paths[1] ]);
				} break;
				case "disconnect": {
					// find matching arc; there should only be 1.
					let found = false;
					for (let i in graph.arcs) {
						let a = graph.arcs[i];
						if (a[0] == d.paths[0] && a[1] == d.paths[1]) {
							assert(!found, "disconnect failed: more than one matching arc");
							found = true;
							graph.arcs.splice(i, 1);
						}
					}
					assert(found, "disconnect failed: no matching arc found");
				} break;
			}
		}
	}
}

function graphFromDeltas(deltas) {
	let graph = {
		nodes: {},
		arcs: []	
	};

	applyDeltasToGraph(graph, deltas) 

	return graph;
}

function nodesToDeltas(nodes, deltas, pathprefix) {
	for (let name in nodes) {
		if (name == "_props") continue;
		let group = [];
		let n = nodes[name];
		let p = n._props;
		let d = copyProps(n._props, {
			op: "newnode", 
			path: pathprefix + name, 
		});
		group.push(d);
		// also push children:
		nodesToDeltas(n, group, pathprefix+name+".");

		deltas.push(group);
	}
	return deltas;
}

function deltasFromGraph(graph, deltas) {
	nodesToDeltas(graph.nodes, deltas, "");

	for (let a of graph.arcs) {
		// TODO: assert that the paths exist?
		deltas.push({
			op: "connect",
			paths: [ a[0], a[1] ]
		})
	}
	return deltas;
}


let g = graphFromDeltas(deltas);

console.log("graph: ", JSON.stringify(g, null, "  "));

let d = deltasFromGraph(g, [])

console.log("deltas: ", JSON.stringify(d, null, "  "));

let id = inverseDelta(d);

console.log("deltas: ", JSON.stringify(id, null, "  "));

applyDeltasToGraph(g, id);

console.log("graph: ", JSON.stringify(g, null, "  "));