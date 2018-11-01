///////////////////// UTILS /////////////////////

// generate a unique identifier name
let uid = (function() {
  let id = 0;
  return function(name) {
    if (name) {
      // TODO: trim trailing underscores, numbers & whitespace
      //name = safename(name);
    }
    // check again: might have trimmed the entire name away
    if (!name) name = "anon";
    return name + "_" + id++;
  };
})();

var ws;
function ws_connect(opt) {
  ws = new WebSocket(
    opt.transport + "://" + opt.host + ":" + opt.port,
    opt.protocols
  );
  ws.binaryType = "arraybuffer";
  ws.onerror = opt.onerror;
  ws.onopen = opt.onopen;
  ws.onmessage = opt.onmessage;
  ws.onclose = function(e) {
    ws = null;
    setTimeout(function() {
      console.log("websocket reconnecting...");
      ws_connect(opt);
    }, 2000);
    opt.onclose(e);
  };
  return ws;
}

///////////////////// LAYOUT /////////////////////

let graph = document.getElementById("graph");
let svg_canvas = document.getElementById("svgcanvas");
let code = document.getElementById("code");
let library = document.getElementById("library");
let ast = document.getElementById("ast");
let info = document.getElementById("info");
//console.log(document.getElementById("header").innerText)
let grammar = document.getElementById("grammar").innerText;
let header = document.getElementById("header").innerText;
let parser = PEG.buildParser(grammar);
let ops = parser.parse(header);

// build up the library:
let ops_ = [
  {
    label: "int zap(int x)",
    name: "zap",
    params: [{ name: "x", typename: "int" }],
    return_typename: "int"
  },
  {
    label: "int zip(float x, float y)",
    name: "zip",
    params: [{ name: "x", typename: "float" },{name: 'y', typename: "float"}],
    return_typename: "int"
  },
  {
    label: "void nothing()",
    name: "nothing",
    params: [],
    return_typename: "void"
  }
];

/////
console.log(ops)
  for (let op of ops) {
    let div = document.createElement("div");
    div.classList.add("item");
    div.appendChild(document.createTextNode(op.label));
    op.mangled = mangler(op.label)
    library.appendChild(div);

    // set id for filtering:
    div.setAttribute("id", mangler(op.label));

    // make draggable:
    div.setAttribute("draggable", "true");
    div.addEventListener("pointerover", e => {
      info.innerText = op.comments;
    });
    div.addEventListener("dragstart", e =>
      e.dataTransfer.setData("text/plain", JSON.stringify(op))
    );
  }

  // pass the library to the libSearch function for result filtering
  libSearch(ops)

/*
	A node be a container of:
	- name
	- attrs
	- optional control flow inlet 
	- optional control flow outlet(s)
	- optional data inlet(s)
	- optional data outlet(s)
		
	Control flow inlet is absent for event handler nodes, i.e. new functions

*/

function node_create(op, x, y) {
  
  let id = uid(op.name);
  // create a node for it:
  let div = document.createElement("div");
  div.id = id;
  div.classList.add("node");
  // position it:
  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  // make moveable:
  div.addEventListener("pointerdown", e => {
    // TODO: might need to go up the hierarchy to find the div.
    let el = e.srcElement;
    el = el.closest(".node");

    // cache offset of object from mouse:
    let ox = el.offsetLeft - e.screenX; //offsetX;
    let oy = el.offsetTop - e.screenY;
    // let ox = div.style.left - el.screenX; //offsetX;
    // let oy = div.style.top - el.screenY;
    //console.log(el, ox, oy, div.style.left, div.style.top);
    let drag = function(e) {
      // here "e" is document relative.
      let dx = ox + e.screenX; // - ox;
      let dy = oy + e.screenY; // - oy;
      div.style.left = `${dx}px`;
      div.style.top = `${dy}px`;
      dirty = true;
      e.preventDefault();
    };
    // has to be document level, so we can drag beyond bounds:
    document.addEventListener("pointermove", drag);
    document.addEventListener("pointerup", e => {
      document.removeEventListener("pointermove", drag);
      // e.preventDefault(); // allow it, to cancel any other drags too
    });
    e.preventDefault();
  });

  // add components to the box:
  //let inlet_strip = $('<div class="nlet_row" />').appendTo(div);
  let inlet_strip = document.createElement("div");
  inlet_strip.classList.add("nlet_row");
  div.appendChild(inlet_strip);

  //let content = $('<div class="nodetext">' + op.name + "</div>").appendTo(div);
  let content = document.createElement("div");
  content.classList.add("nodetext");
  content.appendChild(document.createTextNode(op.name));
  div.appendChild(content);

  //let outlet_strip = $('<div class="nlet_row" />').appendTo(div);
  let outlet_strip = document.createElement("div");
  outlet_strip.classList.add("nlet_row");
  div.appendChild(outlet_strip);

  // add inlets & outlets to the inlet/outlet strips:
  let inlet = document.createElement("div");
  inlet.classList.add("inlet");
  inlet.appendChild(document.createTextNode("exec"));
  inlet.setAttribute("data-object", id);
  inlet.setAttribute("data-inlet", 0);
  inlet.setAttribute("data-type", "exec");
  inlet.addEventListener("pointerdown", inlet_mousedown);
  inlet.addEventListener("pointerUp", inlet_mouseup);
  inlet_strip.appendChild(inlet);
  op.params.forEach((port, i) => {
    let inlet = document.createElement("div");
    inlet.classList.add("inlet");
    inlet.appendChild(
      document.createTextNode(port.type.name + " " + port.name)
    );
    inlet.setAttribute("data-object", id);
    inlet.setAttribute("data-inlet", i + 1);
    inlet.setAttribute("data-type", port.type.name);
    inlet.addEventListener("pointerdown", inlet_mousedown);
    inlet.addEventListener("pointerUp", inlet_mouseup);
    inlet_strip.appendChild(inlet);
  });

  // outlets:
  let outlet = document.createElement("div");
  outlet.classList.add("outlet");
  outlet.appendChild(document.createTextNode("exec"));
  outlet.setAttribute("data-object", id);
  outlet.setAttribute("data-outlet", 0);
  outlet.setAttribute("data-type", "exec");
  outlet.addEventListener("pointerdown", inlet_mousedown);
  outlet.addEventListener("pointerUp", inlet_mouseup);
  outlet_strip.appendChild(outlet);
  if (op.return_type) {
    let outlet = document.createElement("div");
    outlet.classList.add("outlet");
    outlet.appendChild(document.createTextNode(op.return_type.name));
    outlet.setAttribute("data-object", id);
    outlet.setAttribute("data-outlet", 0);
    outlet.setAttribute("data-type", op.return_type.name);
    outlet.addEventListener("pointerdown", inlet_mousedown);
    outlet.addEventListener("pointerUp", inlet_mouseup);
    outlet_strip.appendChild(outlet);
  }
  graph.appendChild(div);
}

function inlet_mousedown(e) {}
function inlet_mouseup(e) {}

// let graph allow objects to be dragged on:
graph.addEventListener("dragover", e => e.preventDefault());
graph.addEventListener("dragenter", e => e.preventDefault());
graph.addEventListener("drop", function(e) {
  let op = JSON.parse(e.dataTransfer.getData("text"));
  //console.log(e);
  node_create(op, e.offsetX, e.offsetY);
});

// attach handlers:
svg_canvas.addEventListener("click", e => {
  if (e.target.nodeName == "path") {
    console.log("clicked on path", e.target.id);
  }
});
svg_canvas.addEventListener("pointerdown", e => {
  //node_editor_done();
  //delete node_editor_started.element;
  //mousepos.left = e.pageX;
  //mousepos.top = e.pageY;
});
svg_canvas.addEventListener("pointermove", e => {
  // 		mousepos.left = e.pageX;
  // 		mousepos.top = e.pageY;
  // 		// continuously redraw if we are currently drawing a line:
  // 		if (line_editing) {
  // 			// TODO: update the line_edit.path
  // 			console.log("editing line")
  // 			//path_update(line_edit.path, "line_edit", line_edit.inlet, outlet_idx, to, inlet_idx, default_to_mouse)
  // 		}
});
//svg_canvas.addEventListener("pointerup", line_edit_discard);


function update_canvas() {
  // update paths to match boxes:
  $(svg_canvas)
    .children()
    .each(function(i, e) {
      let path = $(e);
      let id = path.attr("id");
      if (!id) return;

      if (id == "line_edit") {
        // special case:
      } else {
        // need to manually update patch-cords:
        path_update(
          path,
          id,
          path.attr("data-from"),
          path.attr("data-outlet"),
          path.attr("data-to"),
          path.attr("data-inlet")
        );
      }
    });
  // refresh DOM (or refresh svg's parent for Edge/IE and Safari)
  //svg_canvas.parent().html(svg_canvas.parent().html());
  $(svg_canvas).html($(svg_canvas).html());
}

function path_update(
  path,
  id,
  from, outlet_idx,
  to, inlet_idx,
  default_to_mouse
) {
   
  let src_div = $(document.getElementById(from));
  let dst_div = $(document.getElementById(to));
    
  // remove lines connected to obsolete objects
  if (!default_to_mouse && (!src_div.length || !dst_div.length)) {
    console.log("pruning orphaned line", id, "from", from, "to", to);
    path.remove();
    return;
  }

  let outlet = $(src_div.find(".nlet_row").find(".outlet")[outlet_idx]);
  let inlet = $(dst_div.find(".nlet_row").find(".inlet")[inlet_idx]);
  if (!default_to_mouse && (!outlet || !inlet)) {
    console.log("pruning nlet orphaned line", id);
    path.remove();
    return;
  }

  let p0, p1;
  if (outlet.length) {
    let src_offset = outlet.offset();
    p0 = {
      x: src_offset.left + outlet.outerWidth(),
      y: src_offset.top + outlet.outerHeight() / 2
    };
  } else {
    p0 = { x: mousepos.left, y: mousepos.top };
  }
  if (inlet.length) {
    let dst_offset = inlet.offset();
    p1 = {
      x: dst_offset.left,
      y: dst_offset.top + outlet.outerHeight() / 2
    };
  } else {
    p1 = { x: mousepos.left, y: mousepos.top };
  }
  let dx = Math.max(20, Math.abs(p1.x - p0.x) * 0.33);
  let code = `M${p0.x},${p0.y}C${p0.x + dx},${p0.y} ${p1.x - dx},${p1.y} ${p1.x},${p1.y}`;
  path.attr("d", code);
}

function animate() {
  // use requestAnimationFrame for updates
  // so that it doesn't waste energy when not visible
  requestAnimationFrame(animate);
  // use 'dirty' flag to only re-render when needed
  if (dirty) {
    dirty = false;
    update_canvas();
  }
}


// demo:
node_create(ops[0], 20, 30);
node_create(ops[1], 20, 70);

let line = { id: uid("line"), from: "zap_0", outlet: 0, to: "zip_1", inlet: 0 };
let path = $(`<path class="patchline" id="${line.id}" />`)
  .attr("data-from", line.from)
  .attr("data-to", line.to)
  .attr("data-outlet", line.outlet)
  .attr("data-inlet", line.inlet)
  .appendTo($(svg_canvas));


let dirty = true;
requestAnimationFrame(animate);