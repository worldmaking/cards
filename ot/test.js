let assert = require("assert");
let ot = require("./ot.js");


// {
// 	let res = ot.findPathContainer(graph.nodes, "a");
// 	console.log(res)
// 	assert(res[0] == graph.nodes)
// 	assert(res[1] == "a");
// }

// {
// 	let res = ot.findPathContainer(graph.nodes, "b.c");
// 	assert(res[0] == graph.nodes.b)
// 	assert(res[1] == "c");
// }

// {
// 	let res = ot.findPathContainer(graph.nodes, "c");
// 	assert(res[0] == undefined);	
// }

// {
// 	let res = ot.findPathContainer(graph.nodes, "x");
// 	assert(res[0] == undefined);		
// }

// {
// 	let res = ot.findPathContainer({}, "a");
// 	assert(res[0] == undefined);			
// }

// testing:
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

let g = ot.graphFromDeltas(deltas);
console.log("\n--- graph ---")
console.log(ot.graphToString(g))

let d = ot.deltasFromGraph(g, [])
console.log("\n--- deltas ---")
console.log(ot.deltasToString(d))

let id = ot.inverseDelta(d);
console.log("\n--- deltas ---")
console.log(ot.deltasToString(id))

ot.applyDeltasToGraph(g, id);
console.log("\n--- graph ---")
console.log(ot.graphToString(g))