let assert = require ("assert");

// see https://github.com/worldmaking/cards/wiki/List-of-Operational-Transforms
/*
	Every op should be invertible (which means, destructive edits must include full detail of what is to be deleted)
	Changes are rebased by graph path (rather than character position as in text documents)

	Simultaneous edits must be merged: the second is rebased by the first. 
*/

function deepEqual(a, b) {
	// TODO FIXME expensive lazy way:
	return JSON.stringify(a) == JSON.stringify(b);
}

function deepCopy(a) {
	// TODO FIXME expensive lazy way:
	return JSON.parse(JSON.stringify(a));
}

// copy all properties from src to dst
// excepting any reserved keys (op, path)
let copyProps = function(src, dst) {
	for (let k in src) {
		if (k == "op" || k == "path") continue;
		// recursive objects (deep copy)
		// TODO FIXME expensive lazy way:
		dst[k] = deepCopy(src[k]);
	}
	return dst;
}

// (unused)
// // find a path within a tree:
// let findPath = function(tree, path) {
// 	let steps = path.split(".");
// 	let n = tree;
// 	for (let k in steps) {
// 		assert(n[k], "failed to find path");
// 		n = n[k];
// 	}
// 	return n;
// }

// given a tree, find the node that contains last item on path
// returns [undefined, path] if the path could not be fully resolved
let findPathContainer = function(tree, path) {
	let steps = path.split(".");
	let last;
	let container;
	let node = tree;
	for (let i=0; i<steps.length; i++) {
		let k = steps[i]
		//assert(node[k], "failed to find path: "+k);
		if (!node[k]) return [undefined, k];
		last = k;
		container = node;
		node = node[k];
	}
	return [container, last];
}

// given path "a.b.c.d", creates object root.a.b.c.d
// throws error if root.a.b.c doesn't exist
// throws error if root.a.b.c.d already exists
let makePath = function(root, path) {
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

// given a delta it returns the inverse operation 
// such that applying inverse(delta) undoes all changes contained in delta
let inverseDelta = function(delta) {
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

let applyDeltasToGraph = function (graph, deltas) {
	if (Array.isArray(deltas)) {
		for (let d of deltas) {
			applyDeltasToGraph(graph, d);
		}
	} else {
		switch (deltas.op) {
			case "newnode": {
				let o = makePath(graph.nodes, deltas.path);
				copyProps(deltas, o._props);
			} break;
			case "delnode": {
				let [ctr, name] = findPathContainer(graph.nodes, deltas.path);
				let o = ctr[name];
				assert(o, "delnode failed: path not found");
				// assert o._props match delta props:
				for (let k in o._props) {
					assert(deepEqual(o._props[k], deltas[k]), "delnode failed; properties do not match");
				}
				delete ctr[name];
			} break;
			case "connect": {
				// TODO: assert connection does not yet exist
				assert(undefined == graph.arcs.find(e => e[0]==deltas.paths[0] && e[1]==deltas.paths[1]), "connect failed: arc already exists");

				graph.arcs.push([ deltas.paths[0], deltas.paths[1] ]);
			} break;
			case "disconnect": {
				// find matching arc; there should only be 1.
				let found = false;
				for (let i in graph.arcs) {
					let a = graph.arcs[i];
					if (a[0] == deltas.paths[0] && a[1] == deltas.paths[1]) {
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

let propToString = function(prop) {
	if (typeof prop == "number") {
		return prop;
	} else if (typeof prop == "string") {
		return `"${prop}"`;
	} else if (Array.isArray(prop)) {
		return `[${prop.map(propToString).join(",")}]`
	}
}

let propsToString = function(props) {
	let res = [];
	for (let k of Object.keys(props)) {
		let v = props[k];
		
		res.push(`${k}=${propToString(v)}`)
	}
	return res.join(", ");
}

let nodeToString = function(node, indent) {
	let keys = Object.keys(node);
	let children = [];
	let props = "";
	if (node._props) {
		props = `[${propsToString(node._props, indent)}]`;
	}
	for (let key of keys) {
		if (key != "_props") {
			let s = `${"  ".repeat(indent)}${key} ${nodeToString(node[key], indent+1)}`;
			children.push(s);
		}
	}

	if (children.length > 0) {
		if (props) props += `\n`
		props += `${children.join("\n")}`;
	} 

	return props;
}

let graphToString = function(graph) {
	assert(graph.nodes);
	assert(graph.arcs);
	let arcstrings = [];
	for (let a of graph.arcs) {
		arcstrings.push(`${a[0]} -> ${a[1]}`);
	}
	return `${nodeToString(graph.nodes, 0)}\n${arcstrings.join("\n")}`;
}

let deltaToString = function(delta) {
	// { op:"newnode", path:"a", kind:"noise", pos:[10,10] }, 
	let args = [];
	for (let k of Object.keys(delta)) {
		if (k != "op" && k != "path" && k != "paths") {
			args.push(`${k}=${propToString(delta[k])}`);
		}
	}
	let path = delta.path;
	if (!path && delta.paths) {
		path = delta.paths.join(", ");
	}
	return `${delta.op} (${path}) ${args.join(", ")}`
}

let deltasToString = function(deltas, indent) {
	if (indent == undefined) indent = 0
	if (Array.isArray(deltas)) {
		return deltas.map(function(v) {
			return deltasToString(v, indent+1)
		}).join(`\n${"  ".repeat(indent)}`);
	} else {
		return deltaToString(deltas);
	}
}

module.exports = {

	graphFromDeltas(deltas) {
		let graph = {
			nodes: {},
			arcs: []	
		};
	
		applyDeltasToGraph(graph, deltas) 
	
		return graph;
	},

	deltasFromGraph(graph, deltas) {
		nodesToDeltas(graph.nodes, deltas, "");
	
		for (let a of graph.arcs) {
			// TODO: assert that the paths exist?
			deltas.push({
				op: "connect",
				paths: [ a[0], a[1] ]
			})
		}
		return deltas;
	},

	findPathContainer: findPathContainer,
	inverseDelta: inverseDelta,
	applyDeltasToGraph: applyDeltasToGraph,

	graphToString: graphToString,
	deltasToString: deltasToString,
}