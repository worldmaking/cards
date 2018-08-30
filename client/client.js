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
			type: "get_pat",
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
		case "set_pat": {

			// update whole scene based on msg.value
			console.log(msg.value);

			break;
		}
	}
}