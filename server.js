
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
const project_path = path.join(__dirname, "cpp2json");
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

function cpp2json(filename, session){
	console.log("cpp2json " + session)
	execSync("./cpp2json test.cpp test.json", {cwd: path.join(server_path, "cpp2json")}, (stdout, stderr, err) => {
		
		// TODO if the code failed to compile, send the error message to the client and prevent committing a broken file
		// THIS ISN"T WORKING:
	// 	if (stderr || err) {
	// 		var newError = (stderr + err).toString()
	// 		session.socket.send(JSON.stringify({
	// 			session: session.id,
	// 			date: Date.now(),
	// 			type: "compile_error",
	// 			value: newError
	// 		}))
	// 		return;
	// 	} 		
	// })
	 	console.log("successful compile " + filename)
	// if the file has been modified by the client:
	})
	// read the result of cpp2json 
	ast = JSON.parse(fs.readFileSync(path.join(server_path, "/cpp2json/test.json"), 'utf8'));
	return ast;
}

function git(session, filename){
	console.log(session, filename, path.join(project_path, filename))
		// add and commit it to the repo
  exec('git add ' + path.join(project_path, filename))
	exec('git commit -m "successful compile"', (stdout, stderr, err) => {
		console.log(stdout, stderr, err)
	})
	// eventually could run this instead : "git log -1" > it returns the HEAD commit, plus author name and branch
	exec('git log --pretty=oneline -1', (stdout, stderr, err) => {
		// console.log("\n\n\n stdout is " + stdout)
		console.log("\n\n\n stderr is " + stderr)
		// console.log("\n\n\n err is " + err)
		hash = stderr;
		// if commit successful, pass the commit hash to the git function
		session.socket.send(JSON.stringify({
			filename: filename,
			session: session.id,
			date: Date.now(),
			type: "git",
			hash: hash,
			//data: hash
		}))

	})



}

function handleMessage(msg, session) {
	
	switch (msg.type) {

		case "get_ast": {
			send_ast(cpp2json(), session);
		}
		break;

		case "code": {
			fs.writeFileSync(path.join(server_path, "cpp2json", msg.filename), msg.value, 'utf8')
			//console.log(msg.filename, session)
			//console.log(msg.value)
				//check that changes made to file compile correctly
			execSync("./cpp2json test.cpp test.json", {cwd: path.join(server_path, "cpp2json")}, (stdout, stderr, err) => {
				// NEED SOMETHING THAT RECEIVES COMPILE RESULT FROM CPP2JSON
				//if compile === true:
			})

			// exec('git rev-parse HEAD', (stdout, stderr, err) => {
			// 	console.log("\n\n\n stdout is " + stdout)
			// 	console.log("\n\n\n stderr is " + stderr)
			// 	console.log("\n\n\n err is " + err)
			// })
			git(session, msg.filename);
		}

		break

		case "show":
			// get the actual code from our file, based on selected hash
			exec('git show ' + msg.hash + ":./" + msg.filename, {cwd: project_path}, (stdout, err, stderr) => {
				//console.log(stdout, err, stderr)
				console.log(err)
				//write the code to a temp file
				fs.writeFileSync(path.join(server_path, "cpp2json", "temp.cpp"), err, 'utf8')
			})
			// get the ast graph!
			execSync("./cpp2json temp.cpp temp.json", {cwd: path.join(server_path, "cpp2json")})
			// read the ast graph
			ast = JSON.parse(fs.readFileSync(path.join(server_path, "/cpp2json/temp.json"), 'utf8'));
			// send it to client
			send_ast(ast, session);
			
		break
		
	}
}