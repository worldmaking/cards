
/////////////// EDITOR STUFF

function ast2html(ast, parent, root) {
	let kind = ast.ast;
	let loc = ast.loc;
	let locstr = `${loc.filepath}@${loc.begin.line}:${loc.begin.col}-${loc.end.line}:${loc.end.col}`;
	let summary = kind + " " + ast.name;
	if (kind == "FunctionTemplate" || kind == "FunctionDecl" || kind == "CXXMethod") {
		summary += "()"
	}
	let filecode = root.files[loc.filepath];
	let code = filecode.substr(loc.begin.char, loc.end.char-loc.begin.char);
	let div = $('<div class="ast '+kind.toLowerCase()+'" />')
		.html(summary)
		.on('click', function(e) {
			// hide/show on click
			div.children().toggle();
			e.stopPropagation();
		})
		.appendTo(parent);

	$('<textarea />').text(code).appendTo(div).hide();

	if (ast.nodes) {
		for (node of ast.nodes) {
		ast2html(node, div, root);
		}
	}

	// hide or show this?
	//div.children().hide();
}

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

function handleMessage(msg) {
	switch (msg.type) {
		case "set_ast": {

			// update whole scene based on msg.value
			console.log(msg.value);

			let ast = msg.value;
			$("#tree").children().remove();
			ast2html(ast, $("#tree"), ast);
			break;
		}
	}
}

