
const express = require('express');
const WebSocket = require('ws');

const http = require('http');
const url = require('url');
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec, execSync, spawn, spawnSync, fork } = require('child_process')
const terminal = require("web-terminal");
const ip = require('ip')


//process.chdir(process.argv[2] || ".");
const project_path = process.cwd();
const server_path = __dirname;
const client_path = path.join(server_path, "client");
console.log("project_path", project_path);
console.log("server_path", server_path);
console.log("client_path", client_path);

let sessionId = 0;
let sessions = [];

const app = express();
app.use(express.static(client_path))
app.get('/', function(req, res) {
	res.sendFile(path.join(client_path, 'index.html'));
});
//app.get('*', function(req, res) { console.log(req); });
const server = http.createServer(app);
// add a websocket service to the http server:
const wss = new WebSocket.Server({ server });

// send a (string) message to all connected clients:
function send_all_clients(msg) {
	wss.clients.forEach(function each(client) {
		client.send(msg);
	});
}

// whenever a client connects to this websocket:
wss.on('connection', function(ws, req) {
    // it defines a new session:
	let session = {
		id: sessionId++,
		socket: ws,
	};
	sessions[session.id] = session;
	console.log("server received a connection, new session " + session.id);
	console.log("server has "+wss.clients.size+" connected clients");
	
	const location = url.parse(req.url, true);
	// You might use location.query.access_token to authenticate or share sessions
	// or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

	
	ws.on('error', function (e) {
		if (e.message === "read ECONNRESET") {
			// ignore this, client will still emit close event
		} else {
			console.error("websocket error: ", e.message);
		}
	});

	// what to do if client disconnects?
	ws.on('close', function(connection) {
		console.log("session", session.id, "connection closed");
		delete sessions[session.id];
	});
	
	// respond to any messages from the client:
	ws.on('message', function(e) {
		//console.log(e)
		if(e instanceof Buffer) {
			// get an arraybuffer from the message:
			const ab = e.buffer.slice(e.byteOffset,e.byteOffset+e.byteLength);
			console.log("session", session.id, "received arraybuffer", ab);
			// as float32s:
			console.log(new Float32Array(ab));
		} else {
			// get JSON from the message:
			try {
				let msg = JSON.parse(e);
				console.log("session", session.id, "received JSON", msg);
				handleMessage(msg, session);

			} catch (e) {
				console.log('bad JSON: ', e);
			}
		}
	});

	// // Example sending binary:
	// const array = new Float32Array(5);
	// for (var i = 0; i < array.length; ++i) {
	// 	array[i] = i / 2;
	// }
	// ws.send(array);
});

server.listen(8080, function() {
	console.log('server listening on %d', server.address().port);
});

// HTTP SERVER for Terminal:

 
var terminalApp = http.createServer(function (req, res) {
  res.writeHead(200, {"Content-Type": "text/plain"});
  res.end("Hello World\n");
});

terminalApp.listen(1337);
console.log("Server running at http://127.0.0.1:1337/");

terminal(terminalApp);
console.log('Web-terminal accessible at http://' + ip.address() + ':8088/terminal');


///////////////////// APP LOGIC /////////////////////

// example 'scene' data structure
let ast = JSON.parse(fs.readFileSync(path.join(server_path, "/cpp2json/test.json"), "utf8"));

function send_ast(ast, session) {
	session.socket.send(JSON.stringify({
		session: session.id,
		date: Date.now(),
		type: "set_ast",
		value: ast
	}));
}

function cpp2json(){
	execSync("./cpp2json test.cpp test.json", {cwd: path.join(server_path, "cpp2json")}, (stdout, stderr, err) => {
		if (stderr || err) {
			var newError = (stderr + err).toString()
			session.socket.send(JSON.stringify({
				session: session.id,
				date: Date.now(),
				type: "compile_error",
				value: newError
			}))
			return;
		} else {
			ast = JSON.parse(fs.readFileSync(path.join(server_path, "/cpp2json/test.json"), 'utf8'));
			return ast;

		}
	})
	// execSync("")
	// TODO -- sync from disk here?

}

function handleMessage(msg, session) {
	
	switch (msg.type) {

		case "get_ast": {
			send_ast(cpp2json(), session);
		}
		break;

		case "code": {
			console.log(msg.filename)
			fs.writeFileSync(path.join(server_path, "cpp2json", msg.filename), msg.value, 'utf8')
			send_ast(cpp2json(), session);
		}

		break
		
	}
}