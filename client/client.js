/////////////// EDITOR STUFF

//workaround for cross domain origin requests issue
document.domain = document.domain;

/////draggable divs:
$( function() {
	$( "#tree" ).draggable({ scroll: true, scrollSensitivity: 100});
	$( "#codeView" ).draggable({ scroll: true, scrollSensitivity: 100 });
	$( "#terminal" ).draggable({ iframeFix: true, scroll: true, scrollSensitivity: 100 });
	// $(document.getElementById("terminal").contentWindow.document.getElementById("terminalDiv")).draggable({iframeFix: true, });

} );

<<<<<<< HEAD
function ast2html(kind, parent, root) {
	let id = kind.id;
	let kind = kind.kind;
	let loc = kind.loc;
	let locstr = `${loc.filepath}@${loc.begin.line}:${loc.begin.col}-${loc.end.line}:${loc.end.col}`;
	let summary = `${id} ${kind} ${kind.name || ""}`;
=======
function ast2html(ast, parent, root) {
	let id = ast.id;
	let kind = ast.kind;
	let loc = ast.loc;
	let locstr = `${loc.filepath}@${loc.begin.line}:${loc.begin.col}-${loc.end.line}:${loc.end.col}`;
	let summary = `${kind} ${ast.name || ""}`;
>>>>>>> 38f6888897f9a74bd0389435e2a614c51ba41d84
	if (kind == "FunctionTemplate" || kind == "FunctionDecl" || kind == "CXXMethod") {
		summary += "()"
	}
	let filecode = root.files[loc.filepath];
	let code = filecode.substr(loc.begin.char, loc.end.char-loc.begin.char);
	let div = $('<div id="node_'+id+'" class="kind '+kind.toLowerCase()+'" />')
		.html(summary)
		.on('click', function(e) {
			// hide/show on click
			div.children().toggle();
			e.stopPropagation();
			console.log(id, loc)
			highlightLine(loc)
		})
		.appendTo(parent);

	$('<textarea />').text(code).appendTo(div).hide();

	if (kind.nodes) {
		for (node of kind.nodes) {
		ast2html(node, div, root);
		}
	}

	// hide or show this?
	//div.children().hide();
}


///// File Chooser
function filePicker(cardsFileList) {
	// first clear the select element options before populating it again
	document.getElementById('openFileName').options.length = 2;

	var sel = document.getElementById('openFileName')
	// console.log(cardsFileList)

	cardsFileList.forEach(function(element) {
		// console.log(element)
		var opt = document.createElement('option')
		opt.appendChild(document.createTextNode(element))
		opt.value = element
		sel.appendChild(opt)
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
	dv.setSize(500, 900)

}

// //// Codemirror Highlighting
var lastLine; 
// ///////////////////////////////////////////////////
function highlightLine(loc) {
// provide line highlighting for in the codemirror editor so user can easily spot parameters 
// in the state.h file:
// get the begin-end lines of each parameter within the state.h!
	// Object.keys(state).forEach(function(key, value) {
		// pName = state[key].paramName;
		// begin = state[key].begin - 1;
		// end = state[key].end;

line =	loc.begin.line -1
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
			console.log(lines[key].begin)
			dv.removeLineClass(lines[key].begin, 'background');

		});
	});

})
  
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
		case "set_ast": {

			// update whole scene based on msg.value
			// console.log(msg.value);

			let kind = msg.value;
			cppSource = msg.value.files;
			let files = Object.keys(cppSource) // set list of files
			filePicker(files) // update the file list in the filepicker menu
			cpp2CodeMirror(cppSource[Object.keys(cppSource)[1]], $("#codeView")); //put the cpp code in codemirror
			$("#tree").children().remove(); // clear the tree
			ast2html(kind, $("#tree"), kind); // decorate the tree...
			
			break;
		}
	}
}

