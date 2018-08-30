////////////////////////////////////////////////////////////////////////////
/*

Overview

Presents an editable node-based scene in a browser.
Using CSS as much as possible to simplify the editor code.
Currently depends on jquery for convenience, but that dependency could easily be removed.

It draws lines into an SVG canvas, and draws node boxes as <div>s above them. Nodes have this hierarchy:

<div class="node" id=(scene's node id>
	<div class="nlet_row">
		<div class="inlet" data-inlet=0 /> 
		<div class="inlet" data-inlet=1 /> 
		...
	</div>
	<div class="nodetext">The node's text content</div>
	<div class="nlet_row">
		<div class="outlet" data-outlet=0 /> 
		<div class="outlet" data-outlet=1 /> 
		...
	</div>
</div>

---- ISSUES ----

Currently the model & view are too tangled. If the model was being created & verified on a server, this tangling won't work. 

When creating or editing an object, the server needs to parse the text, in order to:
- identify errors
- identify the no. inlets/outlets etc.
- re-map any patchlines if necessary

Even connecting lines may need to go through the server, as it might need to flag any invalid connections (e.g. type mismatch? control-flow logic fail?)

All other edits also need to sync with the server, to update the model including object locations and any other metadata (comments? styles?). 

For collaboration, the server will also need to merge edits & broadcast back.

This means new edits will be received by the browser asynchonously, and may differ from any locally-edited scene. 

Simplest way is to completely redraw when a scene update is received (but this should not destroy any box currently being edited!)

Q: Is there a way to treat the DOM of the patcher as the local model, and the JSON being the server model? It might simplify the browser editor to store all relevant state in the DOM, and then write algorithms to sync between the DOM and the server's JSON. 

---- TODO ----

- Embed codemirror editor instead of <textarea> for the editing component.

- Embed 'subpatchers'
	- 1. visual patchers-within-patchers
	- 2. ability to fip between patcher/codemirror modes

- Editing UI features
	- Tab to flip between box being edited
	- Esc, blur() to end editing a box
	- Multiple selection:
		- nodes and lines
		- Shift click
		- Drag a box
		- Visual identification of selected item(s)
		- Del to delete selection
		- Select all (ctrl/cmd-a?)
		- Select none (esc?)
	- Zoom
	- Convert to "actions" so that undo might work at some point... 

---

It might be nice to use localStorage to cache edits when server is not available, or during dropouts. However, I don't know if this is really possible, as how can we verify text or compute IO counts?

*/

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

///////////////////// FUNCTIONS /////////////////////

function update_scene_node_position(id, x, y) {
	let node = pat.nodes[id];
	if (!node) {
		console.error("update_scene_node_position: can't find node", id);
		return;
	}
	node.pos[0] = x;
	node.pos[1] = y;
}

function node_make_div(id) {
	let node = pat.nodes[id];

	// append a DOM element for the object
	let div = $('<div class="node" id=' + id + "/>")
		.offset({
			left: node.pos[0],
			top: node.pos[1]
		})
		.mousedown(node_mousedown)
		.appendTo(patcher_div);

	// add components to the box:
	let inlet_strip = $('<div class="nlet_row" />').appendTo(div);
	let content = $('<div class="nodetext">' + node.text + "</div>").appendTo(div);
	let outlet_strip = $('<div class="nlet_row" />').appendTo(div);

	// add inlets & outlets to the inlet/outlet strips:
	node.inlets.forEach((inlet, i) => {
		inlet_strip.append(
			$('<div class="inlet" data-inlet=' + i + " />")
				.mousedown(inlet_mousedown)
				.mouseup(inlet_mouseup)
		);
	});
	node.outlets.forEach((inlet, i) => {
		outlet_strip.append(
			$('<div class="outlet" data-outlet=' + i + " />")
				.mousedown(outlet_mousedown)
				.mouseup(outlet_mouseup)
		);
	});

	return div;
}

// start editing a node:
function node_edit_start(element, text) {
	let offset = element.offset();
	let node_editor = $('<textarea class="node_editor" id="node_editor" />')
		.css({
			left: offset.left,
			top: offset.top,
			//width: element.outerWidth(), // + node_editnor_extraspace,
			width: "50%",
			height: element.outerHeight()
		})
		.val(text)
		.appendTo(patcher_div)
		.bind("blur", function() {
			// done editing, hide the editor and show the div again
			let text = node_editor.val();
			element.find(".nodetext").text(text);
			element.show();
			// remove editor:
			node_editor.remove();

			// TODO: update patcher node with this text

			node_editing = false;
			// because boxes may have changed size, must redraw cables:
			update_canvas();
		})
		.focus();

	//element.hide();
	node_editing = true;
}

// called on each keystroke etc. while editing a maxbox
// updates editor size

// for dragging objects:
function node_mousedown(e) {
	e.preventDefault(); // no ugly text selecting
	// because event could be fired from any child element
	// but we don't want the inlets & outlets to trigger box dragging
	var target = $(e.target);
	if (target.hasClass("inlet") || target.hasClass("outlet")) {
		// switch to processing inlets/outlets directly here?
		return;
	}
	e.stopPropagation();

	//node_editor_done();

	let element = $(this);
	let container = element.parent().parent();

	let offset = element.offset();
	let drag_start_x = e.pageX - offset.left;
	let drag_start_y = e.pageY - offset.top;

	let drag_drag = function(e) {
		e.preventDefault();
		e.stopPropagation();
		let left = e.pageX - drag_start_x;
		let top = e.pageY - drag_start_y;
		element.offset({
			top: top,
			left: left
		});

		pat.dirty = true;
	};
	let drag_up = function() {
		container.off("mouseup", drag_up).off("mousemove", drag_drag);
		// now we have clicked on the box, we should place the editor box over it:
		node_edit_start(element, element.find(".nodetext").text());
	};

	container.on("mouseup", drag_up).on("mousemove", drag_drag);
}

// click on an inlet/outlet
function inlet_mousedown(e) {
	e.preventDefault();
	e.stopPropagation();
	line_editing = true;
	line_edit.inlet = $(this);
}

function outlet_mousedown(e) {
	e.preventDefault();
	e.stopPropagation();
	line_editing = true;
	line_edit.outlet = $(this);
}

// mouse release on an inlet/outlet
function inlet_mouseup(e) {
	e.preventDefault();
	e.stopPropagation();
	if (line_editing && line_edit.outlet) {
		line_edit.inlet = $(this);
		line_edit_complete();
	}
}

function outlet_mouseup(e) {
	e.preventDefault();
	e.stopPropagation();
	if (line_editing && line_edit.inlet) {
		line_edit.outlet = $(this);
		line_edit_complete();
	}
}

// patch-line creation completed:
function line_edit_complete() {
	let inlet_idx = +line_edit.inlet.attr("data-inlet");
	let outlet_idx = +line_edit.outlet.attr("data-outlet");
	let src = line_edit.outlet
		.parent()
		.parent()
		.attr("id");
	let dst = line_edit.inlet
		.parent()
		.parent()
		.attr("id");

	pat.lines.push({
		from: src,
		outlet: outlet_idx,
		to: dst,
		inlet: inlet_idx
	});

	line_edit_discard();
}

// patch-line creation was cancelled:
function line_edit_discard() {
	line_editing = false;
	delete line_edit.inlet;
	delete line_edit.outlet;
	pat.dirty = true;
}

function update_patcher() {
	// remove all nodes?
	//patcher_div.find(".node").remove();
	for (let id in pat.nodes) {
		// skip if the node already exists in the DOM
		if ($("#" + id).length === 0) {
			node_make_div(id);
		}
	}

	update_canvas();
}

function update_canvas() {
	// Clean svg content (if you want to update the svg's objects)
	svg_canvas.empty();

	// (loop in reverse for safe removal/traversal):
	for (let i = pat.lines.length - 1; i >= 0; i--) {
		let line = pat.lines[i];
		let src = pat.nodes[line.from];
		let dst = pat.nodes[line.to];
		// remove lines connected to obsolete objects
		if (!src || !dst) {
			console.log("pruning orphaned line", line.id);
			pat.lines.splice(i, 1);
			continue;
		}

		let src_div = $("#" + line.from);
		let dst_div = $("#" + line.to);
		let outlet = $(src_div.find(".nlet_row").find(".outlet")[line.outlet]);
		let inlet = $(dst_div.find(".nlet_row").find(".inlet")[line.inlet]);
		if (!outlet || !inlet) {
			console.log("pruning nlet orphaned line", line.id);
			pat.lines.splice(i, 1);
			continue;
		}

		// line needs a unique id:
		if (!line.id) line.id = uid("line");

		let src_offset = outlet.offset();
		let dst_offset = inlet.offset();
		let p0 = {
			x: src_offset.left + outlet.outerWidth() / 2,
			y: src_offset.top + outlet.outerHeight()
		};
		let p1 = {
			x: dst_offset.left + inlet.outerWidth() / 2,
			y: dst_offset.top
		};

		canvas_draw_line(p0, p1, line.id);
	}

	// draw the temporary line being created in the editor:
	if (line_edit.inlet) {
		let offset = line_edit.inlet.offset();
		let p0 = mousepos;
		let p1 = {
			x: offset.left + line_edit.inlet.outerWidth() / 2,
			y: offset.top
		};
		canvas_draw_line(p0, p1, "line_edit");
	} else if (line_edit.outlet) {
		let offset = line_edit.outlet.offset();
		let p0 = {
			x: offset.left + line_edit.outlet.outerWidth() / 2,
			y: offset.top
		};
		let p1 = mousepos;
		canvas_draw_line(p0, p1, "line_edit");
	}

	// refresh DOM (or refresh svg's parent for Edge/IE and Safari)
	//svg_canvas.parent().html(svg_canvas.parent().html());
	svg_canvas.html(svg_canvas.html());
}

function canvas_draw_line(p0, p1, id) {
	let dy = Math.max(20, Math.abs(p1.y - p0.y) * 0.33);
	let path = $("<path/>", {
		id: id,
		class: "patchline",
		// bezier path from p0 to p1, using dy for a nice curvature
		d: `M${p0.x},${p0.y}C${p0.x},${p0.y + dy} ${p1.x},${p1.y - dy} ${p1.x},${
			p1.y
		}`
	}).appendTo(svg_canvas);
}

function animate() {
	// use requestAnimationFrame for updates
	// so that it doesn't waste energy when not visible
	requestAnimationFrame(animate);
	// use 'dirty' flag to only re-render when needed
	if (pat.dirty) {
		pat.dirty = false;
		update_patcher();
	} else if (line_editing) {
		update_canvas();
	}
}

////////////////////// Launch sequence //////////////////////

// get DOM elements:
let patcher_container_div = $("#patcher");
let patcher_div = $("#patcher");
let svg_canvas = $("#svgcanvas");
let log = $("#log");
let statusbar = $("#statusbar");

// editing state:
let mousepos = { x: 0, y: 0 };
let line_editing = false;
let node_editing = false;
let line_edit = {};
let node_edit = {};

// attach handlers:
svg_canvas
	.click(function(e) {
		if (e.target.nodeName == "path") {
			console.log("clicked on path", e.target.id);
		}
	})
	.mouseup(line_edit_discard)
	.mousedown(function(e) {
		//node_editor_done();
		//delete node_editor_started.element;
		mousepos.x = e.pageX;
		mousepos.y = e.pageY;
	})
	.mousemove(function(e) {
		mousepos.x = e.pageX;
		mousepos.y = e.pageY;

		// continuously redraw if we are currently drawing a line:
		if (line_editing) {
			update_canvas();
		}
	})
	.mouseup(line_edit_discard);

$("body").on("keydown", function(e) {
	// skip key handling if currently writing into a textbox:
	if (node_editing) return;
	switch (e.which) {
		case 78: {
			// 'n'
			let id = uid("node");
			pat.nodes[id] = {
				pos: [mousepos.x, mousepos.y],
				inlets: [{ name: "in0" }, { name: "in1" }],
				outlets: [{ name: "out0" }, { name: "out1" }],
				text: ""
			};

			let div = node_make_div(id);
			node_edit_start(div);
			break;
		}
		default:
			console.log("key", e.which);
			return;
	}
	e.preventDefault();
	e.stopPropagation();
});

// example 'scene' data structure
let pat = {
	nodes: {
		source1: {
			pos: [20, 20],
			inlets: [],
			outlets: [{ name: "value" }],
			text: "a source"
		},
		source2: {
			pos: [100, 30],
			inlets: [],
			outlets: [{ name: "value1" }, { name: "value2" }, { name: "value3" }],
			text: "s"
		},
		sink1: {
			pos: [50, 120],
			inlets: [{ name: "value" }],
			outlets: [],
			text: "a sink"
		},
		sink2: {
			pos: [150, 140],
			inlets: [{ name: "a" }, { name: "b" }],
			outlets: [],
			text: "another sink"
		}
	},
	lines: [
		{ from: "source1", outlet: 0, to: "sink1", inlet: 0 },
		{ from: "source2", outlet: 0, to: "sink1", inlet: 0 },
		{ from: "source2", outlet: 2, to: "sink2", inlet: 1 }
	]
};

pat.dirty = true;
animate();