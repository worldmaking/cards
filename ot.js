const lodash = require('lodash'); // note also available for the browser! <script src="lodash.js"></script>

const deepSet = require('set-value');
const keys = require('all-object-keys');
const jessy = require('jessy');



`// data representation of a graph for the sake of rendering etc. convenience
graph = {
  nodes: {
    a: { pos:[10, 10], kind:"noise", attrs:{} },
    b: { pos:[10, 50], kind:"dac", attrs:{} },
    // sub-group:
    child: [ "group", {}, {a: { pos:[10, 10], kind:"beep", attrs:{} }]
    
  },
  arcs: [
    // from, to (, attrs?)
    ["a", "b"],
    ["child/a", "b"]
  ]
};`

// our beloved graph (maxthpather...minpather...)
graph = {
  nodes: {},
  arcs: []
};
// our delta history
// var deltas = [
//   { op:"newnode", path:"a", kind:"noise", pos:[10,10] }, 
//   { op:"newnode", path:"b", kind:"dac", pos:[10,50] },
//   { op:"connect", paths: ["a", "b"] },
//   { op:"newgroup", path:"child/", pos:[50,50] },
//   { op:"newgroup", path:"child/child2/", pos:[50,50] },
//   { op:"newgroup", path:"child/child2/child3/", pos:[50,50] },
//   { op:"newnode", path:"child/a", kind:"beep", pos:[10,10] },
//   { op:"newnode", path:"child/child2/a", kind:"beep", pos:[10,10] },
//   { op:"newnode", path:"child/child2/child3/a", kind:"beep", pos:[10,10] },
//   { op:"connect", paths: ["child/a", "b"] }
// ];
// todo make slashes in paths dots. 

`graph = {
  nodes: {
    a: { 
      _props: { pos:[10,10], kind:"noise", }, 
      signal: { _kind:"outlet", _props:{} } 
    },
    b: { 
      _props: { pos:[10,50], kind:"dac", }, 
      source: { _kind:"inlet", _props:{} } 
    },
    child: {
      _props: { pos: [10, 10], kind: "group", /*arcs: [],*/ },
      a: { 
        _props: { pos:[10,10], kind:"noise" },
        signal: { _kind:"outlet", _props:{} } 
      },
    },
  },
  arcs: [  
    ["a.signal", "b.source" ],
    ["child.a.signal", "b.source" ],
  ]
  ...
}

child.a.signal -> (unchanged)
loop over child.nodes has to avoid "_props"
is child.a.signal an outlet? check child.a.signal._props.kind == "outlet"`

// list of delta (edit) operations (in order) to create a graph
// each delta is potentially rebase-able (mainly in terms of path changes)
deltas = [
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

// loop through the delta history to generate graph
for (var i = 0; i < deltas.length; i++) {
  var obj = deltas[i];
  switch(obj.constructor){
    // is it a composed/reduced delta?
    case Array:
    // console.log('reduced delta: ',obj)
      switch (obj.kind){
        case 'group':
        // console.log('group: ',obj)

        break;

        default:

        // is obj nested?
        // if (obj.path.includes('.')){
          // retrieve the dirname from the absolute path
          // var childPath = obj.path.substring(0, obj.path.lastIndexOf('.'));
          // create array from dirname
          // childPath = obj.path.split('.');
          // // convert dirname into nested object
          // var nest = function( target, source ) {
          //   for( var i = 0; i < source.length; i++ ) {
          //     target = target[ source[i] ] = target[ source[i] ] || {};
          //   }
          // };       
          // // assign group to graph via dirname
          // nest( graph.nodes, childPath );
         
        // }else{
        //   let props = {pos: obj.pos, kind: obj.kind};
        //   graph.nodes[obj.path] = props;
        // }


        break;
      }
    break;
    // is it an atomic delta?
    case Object:
    // console.log('atomic delta: ',obj)
// _props: { pos: [10, 10], kind: "group", /*arcs: [],*/ },

      switch (obj.kind){
        case 'group':
        // let _props = {};
        //console.log('group: ',obj)
          // is group nested?
          if (obj.path.includes('.')){
            // retrieve the dirname from the absolute path
            var childPath = obj.path.substring(0, obj.path.lastIndexOf('.'));
            // create array from dirname
            childPath = childPath.split('.');
            // convert dirname into nested object
            var nest = function( target, source ) {
              for( var i = 0; i < source.length; i++ ) {
                target = target[ source[i] ] = target[ source[i] ] || {};
              }
            };       
            // assign group to graph via dirname
            nest( graph.nodes, childPath );
          } else{
            let _props = {pos: obj.pos, kind: obj.kind};
            graph.nodes[obj.path] = _props;
          }
        break;

        default:
        let _props = {pos: obj.pos, kind: obj.kind};
        graph.nodes[obj.path] = _props;
        break;
      }
      console.log(graph)

    break;
  }
}

  /*
  switch(obj.op){

    case 'newnode':


    // todo: check if path already exists, and if so throw error. (because otherwise it shouldn't be a 'newnode' op, it should be a 'replace' op, or something else)
      // check if the absolute path depth > parent-most
      if (obj.path.includes('/')){
        // retrieve the dir name from the absolute path
        var childPath = obj.path.substring(0, obj.path.lastIndexOf('/'));
        // store the object's name
        var name = obj.path.substring(obj.path.lastIndexOf('/')+1)
        // convert dirname into dot notation
        childPath = childPath.replace(/\//g, ".")
        // prep object to receive op
        var objectValue = {};
        objectValue[name] = obj
        // set the object along dirname in graph
        deepSet(graph.nodes,childPath,objectValue)
        } else { // if the absolute path depth = parent-most, just add the object to parent-most node
          graph.nodes[obj.path] = obj;
      }
      break;

    case 'connect':
      // add connections to arcs array
      graph.arcs.push(obj.paths)
      break;

    case 'newgroup':
        // retrieve the dirname from the absolute path
        var childPath = obj.path.substring(0, obj.path.lastIndexOf('/'));
        // create array from dirname
        childPath = childPath.split('/');
        // convert dirname into nested object
        var nest = function( target, source ) {
          for( var i = 0; i < source.length; i++ ) {
            target = target[ source[i] ] = target[ source[i] ] || {};
          }
        };       
        // assign group to graph via dirname
        nest( graph.nodes, childPath );
      break;
    
    default:
      console.log('unrecognized op ' + obj.op)
    break;
  }
}

var newDeltas = []

// Visit non-inherited enumerable keys
allKeys = keys(graph.nodes);
console.log(allKeys)
var arrayLength = allKeys.length;
for (var i = 0; i < arrayLength; i++) {
  if (allKeys[i].includes('.op')){
    console.log(allKeys[i].substring(0, allKeys[i].lastIndexOf('.op')));
  }

    // var childPath = obj.path.substring(0, obj.path.lastIndexOf('/'));

    //Do something
}

Object.keys(graph.nodes).forEach(function(key, value) {
    // var isGroup = graph.nodes[key]
    // if (isGroup.includes('/')){
    // var groupPath = isGroup.substring(0, isGroup.lastIndexOf('/'));
    // var newGroup = {op: 'newgroup', path: groupPath, pos: graph.nodes[key].pos}
    // newDeltas.push(newGroup)
    // } else{
    // newDeltas.push(graph.nodes[key])
    // }
});
Object.keys(graph.arcs).forEach(function(key, value) {
 var arc = {op: 'connect', paths: graph.arcs[key]}
  newDeltas.push(arc)
});

console.log('\ngraph = \n',graph)

console.log('\child3 = \n',graph.nodes.child.child2)
console.log('\ndeltas = \n',newDeltas)

// test = 'dave/andrew/3'
// console.log(test.split('/'))

// var child = test.substring(0, test.lastIndexOf('/'));

// console.log(test.length)
// for (var i = 0; i < test.length; i++) {
// console.log(i)
// }

// console.log(getProperty('child.child2', 'nodes'))
*/
