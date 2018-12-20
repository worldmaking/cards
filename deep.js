// const lodash = require('lodash');
// object = {
//   test: {}
// }
// lodash.set(object.test, ['x', 'y', 'z'], 5);
// console.log(object.test);
// // => 5
const deepSet = require('set-value');

graph = {
  nodes: {},
  arcs: []
};

var deltas = [
  { op:"newnode", path:"a", kind:"noise", pos:[10,10] }, 
  { op:"newnode", path:"b", kind:"dac", pos:[10,50] },
  { op:"connect", paths: ["a", "b"] },
  { op:"newgroup", path:"sub/", pos:[50,50] },
  { op:"newgroup", path:"sub/sub2/", pos:[50,50] },
  { op:"newgroup", path:"sub/sub2/sub3/", pos:[50,50] },

  { op:"newnode", path:"sub/a", kind:"beep", pos:[10,10] },
  { op:"newnode", path:"sub/sub2/a", kind:"beep", pos:[10,10] },
  { op:"newnode", path:"sub/sub2/sub3/a", kind:"beep", pos:[10,10] },

  { op:"connect", paths: ["sub/a", "b"] }
];

// var createNestedObject = function( base, names ) {
//   for( var i = 0; i < names.length; i++ ) {
//       base = base[ names[i] ] = base[ names[i] ] || {};
//   }
// };

// // Usage:
// createNestedObject( graph.nodes, ["shapes", "triangle", "points"] );
childPath = ['sub/sub2']
deepSet(graph.nodes,childPath)

console.log(graph)
// Now window.shapes.triangle.points is an empty object, ready to be used.