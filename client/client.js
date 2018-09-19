/////////////// EDITOR STUFF

//workaround for cross domain origin requests issue
document.domain = document.domain;

console.log("localStorage",localStorage)

switch (localStorage.length) {
	case 0:
	$("#treeHandle").css({ float: "left", top: 3, left: 20, width: 300})
	$("#codeViewHandle").css({ float: "left", top: 3, left: 50, width: 400 })
	$("#terminalHandle").css({ float: "left", top: 30, left: 100, width: 400 })
	break;
}

$("#treeHandle").css({ width: $("#treeHandle").width()})
$("#codeViewHandle").css({ width: $("#codeViewHandle").width() })
$("#terminalHandle").css({ width: $("#terminalHandle").width() })

console.log($( "#terminalHandle").height(), $("#terminalHandle").width(), $( "#treeHandle").height(), $("#treeHandle").width(), $( "#codeViewHandle").height(), $("#codeViewHandle").width())
console.log($( "#terminal").height(), $("#terminal").width(), $( "#tree").height(), $("#tree").width(), $( "#codeView").height(), $("#codeView").width())

// editor positions
var sPositions = localStorage.positions || "{}",
			positions = JSON.parse(sPositions);
// editor sizes
var sSizes = localStorage.sizes || JSON.stringify({terminalHandle: {width: $("#terminalHandle").width(), height: $("#terminalHandle").height()}}),
//sSizes = JSON.stringify()
			sizes = JSON.parse(sSizes);

var sViews = localStorage.views || "{}",
			views = JSON.parse(sViews)

			// sizes[this.id] = ui.size
			// localStorage.sizes = JSON.stringify(sizes)


function initState (){
	// recall editor views positions
	
	$.each(positions, function (id, pos) {
		switch (id) {
			case "terminalHandle": {
				$("#" + id).css(pos)
				// $("#" + id).css(size)
				// top = pos.top
				// left = pos.left
				// $("#terminal").css({width, height})
			} 

			case "treeHandle": {
				$("#" + id).css(pos)
				// $("#" + id).css(size)

			} break;

			case "codeViewHandle": {
				 $("#" + id).css(pos)
				//  $("#" + id).css(size)
				// height = size.height - 44
				// width = size.width - 5
				// $("#codeView").css({width, height})
			} break;

			default:
			// $("#" + id).css(pos)
			// console.log(id, pos)
			break;
		}
	})

	// recall editor views sizes
	
	$.each(sizes, function (id, size) {

		$("#" + id).css(size)


	})
}

initState()
////jqueryUI
$( function() {
	//draggable divs:
	$( "#treeHandle" ).draggable({ handle: "p", scroll: true, scrollSensitivity: 100, stop: function (event, ui) {
		positions[this.id] = ui.position
		localStorage.positions = JSON.stringify(positions)
		}
	})
	.resizable({
		alsoResize: "#tree", 
		stop: function (event, ui) {
			sizes[this.id] = ui.size
			localStorage.sizes = JSON.stringify(sizes)
			console.log(localStorage.sizes)
			
		}
	});

	$( "#codeViewHandle" ).draggable({ handle: "p", scroll: true, scrollSensitivity: 100, stop: function (event, ui) {
		positions[this.id] = ui.position
		localStorage.positions = JSON.stringify(positions)

		} 
	}).resizable({
		alsoResize: "#codeView", stop: function (event, ui) {
			sizes[this.id] = ui.size
			localStorage.sizes = JSON.stringify(sizes)
			console.log(localStorage.sizes)
		}
	});

	$( "#terminalHandle" ).draggable({ iframeFix: true, scroll: true, scrollSensitivity: 100, stop: function (event, ui) {
		positions[this.id] = ui.position
		localStorage.positions = JSON.stringify(positions)

		} 
	}).resizable({
		// alsoResize: "#terminal", 
		stop: function (event, ui) {
	    sizes[this.id] = ui.size
	console.log("ui.size", ui.size)
	    localStorage.sizes = JSON.stringify(sizes)
	console.log(localStorage.sizes)
	console.log($("#terminalHandle").height(), $("#terminalHandle").width())
		}
	});
});


// $("#draggable3").draggable({
//     containment: "#containment-wrapper",
//     scroll: false,
//     stop: function (event, ui) {
//         positions[this.id] = ui.position
//         localStorage.positions = JSON.stringify(positions)
//     }
// });


function ast2html(ast, parent, root) {
	//console.log(ast)
	let id = ast.id;
	let kind = ast.kind;
	let loc = ast.loc;
	let locstr = `${loc.filepath}@${loc.begin.line}:${loc.begin.col}-${loc.end.line}:${loc.end.col}`;
	let summary = `${kind} ${ast.name || ""}`;
	if (ast.isFunc) {
		summary += "()"
	}
	if (ast.isStmt) {
		summary += ";"
	}
	let filecode = root.files[loc.filepath];
	let code = filecode.substr(loc.begin.char, loc.end.char-loc.begin.char);
	let div = $('<div id="node_'+id+'" class="ast '+kind.toLowerCase()+'" />')
		.html(summary)
		.on('click', function(e) {
			// hide/show on click
			div.children().toggle();
			e.stopPropagation();
			//console.log(id, loc)
			highlightLine(loc)
		})
		.appendTo(parent);

	$('<textarea />').text(code).appendTo(div).hide();

	if (ast.isFunc) {
		// This is how functions are handled:
		if (ast.params) {
			for (node of ast.params) {
				ast2html(node, div, root);
			}
		}
		if (ast.body) ast2html(ast.body, div, root);
	} 

	// all other nodes:
	if (ast.nodes) {
		for (node of ast.nodes) {
			ast2html(node, div, root);
		}
	}

	// hide or show this?
	//div.children().hide();
}

var filename;
///// File Chooser
function filePicker(cardsFileList) {
	// first clear the select element options before populating it again
	document.getElementById('openFileName').options.length = 2;

	var sel = document.getElementById('openFileName')
	// console.log(cardsFileList)

	cardsFileList.forEach(function(element) {
		// console.log(element)
		// set the filename for the editor to communicate with server...
		filename = element;
		var opt = document.createElement('option')
		opt.appendChild(document.createTextNode(element))
		opt.value = element
		sel.appendChild(opt)

		// make sure that the .cpp file is loaded in codemirror first
		if (element.includes(".cpp")) {
			sel.selectedIndex = opt.index;
			openFileName(opt.index)

		}
	})
}

function openFileName (selectedIndex){
	fileIndex = (selectedIndex - 2)
	cpp2CodeMirror(cppSource[Object.keys(cppSource)[fileIndex]], $("#codeView"));
}
///// Main test.cpp Codemirror Editor Instance
function cpp2CodeMirror(cppSource) {
	if (cppSource == null) return
	var target = document.getElementById('codeView')
  target.innerHTML = '';
  dv = CodeMirror(target, {
    // content of the editor
		value: cppSource,
		styleActiveLine: true,
		readOnly: false,
		revertButtons: true,
		linewrapping: true,
		undoDepth: 200,
		cursorBlinkRate: 300,
		cursorScrollMargin: 0, 


    // include line numbers in the left margin
    lineNumbers: true,
    // keep this at 10 or less. if infinite it slows the page down a LOT. this is essentially the size of the buffer beyond what is displayed, and if set to infinite or larger number, enables text searching, but again, page loading is an issue.
    viewportMargin: 10,
    // keep this. we're primarily concerned with being able to edit cpp code
		mode: "clike",
		theme: 'one-dark',
  });
	dv.setSize("100%", "100%")

	//key bindings for left editor
	var leftMap = {
		// OSX
		"Cmd-S": function(cm){saveCode();},
		// Windows
		"Ctrl-S": function(cm){saveCode();}
	}
	dv.addKeyMap(leftMap);

}


// ////saving	
// Send current content within CodeMirror's editor to the server.
function saveCode () {
  // TODO: figure out how to include the var 'authorName' in this
  // message, so that git will commit under this client's git username
  // i.e.  git commit --author="John Doe john@doe.org" -m "message"
  // also, if "guest" is selected, then make sure server just does a regular commit (no added author flag)
  // and email
  // var commitMsg = prompt('Please provide a comment about your changes', 'reticulating splines')
  // if (commitMsg === null) {
  //     console.log("space swords are totally cancelled")
  //       return; //break out of the function early if user cancels
  //   }
  //   var message = "edit?" + editorCM.getValue();
  var changes = dv.getValue()
  // log('Sent LeftEditor Contents to server: ' + commitMsg)
	// log('sending: ' + message);

	ws.send(JSON.stringify({
		//session: session.id,
		filename: filename,
		date: Date.now(),
		type: "code",
		value: changes
	}));
}





// //// Codemirror Highlighting
var lastLine; 
var lines = []
// ///////////////////////////////////////////////////
function highlightLine(loc) {
	// provide line highlighting for in the codemirror editor so user can easily spot parameters 
	// in the state.h file:
	// get the begin-end lines of each parameter within the state.h!
	// Object.keys(state).forEach(function(key, value) {
	// pName = state[key].paramName;
	// begin = state[key].begin - 1;
	// end = state[key].end;
	line = loc.begin.line -1
	// tell codemirror to highlight the chosen line
	// if (pName == paramName){
	// 	// if the parameter is different from previous change, highlight previously modified parameter as blue in the state.h
	if (lastLine !== undefined && lastLine !== loc.begin.line) {
		dv.addLineClass(lastLine, 'background', 'cm-highlight-lastLine');
	}
	// if new parameter change, tell cm where to highlight
	var t = dv.charCoords({line: loc.begin.line, ch: loc.begin.char}, "local").top; 
	var middleHeight = dv.getScrollerElement().offsetHeight / 2; 
	// focus the editor's page around the line
	dv.scrollTo(null, t - middleHeight - 5);
	// apply highlight to the selected parameter-line
	dv.addLineClass(loc.begin.line, 'background', 'cm-highlight');
	// set the cm cursor to the line
	dv.setCursor({line: loc.begin.line, ch: window.lastpo});
	// remember the current selected line for next time we change a param
	lastLine = loc.begin.line;
	// }
	// }) 
}

//// clear highlights
$(function() {
	$("#clearHighlights").click( function(){

		Object.keys(lines).forEach(function(key, value) {
			// console.log(lines[key].begin)

			dv.removeLineClass(lines[key], 'background');
			lastLine = undefined;

		});
	});
})

$(function() {
	$("#clearLocalStorage").click( function(){

		localStorage.clear();
		location.reload();

	});

})


// /////saving



  
/////////////////// WEBSOCKET STUFF

var ws;
function ws_connect(opt) {
	ws = new WebSocket(opt.transport+'://'+opt.host+':'+opt.port, opt.protocols);
	ws.binaryType = 'arraybuffer';
	ws.onerror = opt.onerror;
	ws.onopen = opt.onopen;
	ws.onmessage = opt.onmessage;
	ws.onclose = function(e) {
		ws = null;
		setTimeout(function(){
			console.log("websocket reconnecting...");
			ws_connect(opt);
		}, 2000);		
		opt.onclose(e);
	}
	return ws;
}

ws_connect({
	transport: "ws",
	host: "localhost",
	port: "8080",
	protocols: [],
	onerror: function() {},
	onclose: function(e) { console.log('websocket closed', e.code); },
	onopen: function() {
		console.log('websocket opened');
		// once connected, request the current scene:
		ws.send(JSON.stringify({
			type: "get_ast",
			date: Date.now()
		}));
	},
	onmessage: function(e) { 
		if (e.data instanceof ArrayBuffer) {
			console.log("ws received arraybuffer of " + e.data.byteLength + " bytes");
		} else {
			try {
				var msg = JSON.parse(e.data);
				console.log("ws received JSON", msg);
				handleMessage(msg);
			} catch (e) {
				console.log('ws bad JSON: ', e);
			}
		} 
		// //Example code: send a binary blob:
		// const array = new Float32Array(5);
		// for (var i = 0; i < array.length; ++i) {
		// 	array[i] = i / 2;
		// }
		// ws.send(array);
	},
});

var cppSource; // this must be global

function handleMessage(msg) {
	switch (msg.type) {
		case "set_ast": 
			// update whole scene based on msg.value
			// console.log(msg.value);
			let ast = msg.value;
			cppSource = msg.value.files;
			let files = Object.keys(cppSource) // set list of files
			filePicker(files) // update the file list in the filepicker menu
			cpp2CodeMirror(cppSource[Object.keys(cppSource)[1]], $("#codeView")); //put the cpp code in codemirror
			
			$("#tree").children().remove(); // clear the tree
			ast2html(ast, $("#tree"), ast); // decorate the tree...
			
			break;
		case "git":
		console.log(msg.value)
	}
}

