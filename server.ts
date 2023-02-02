let sockets = new Set<WebSocket>();
const channel = new BroadcastChannel("chat");

function distribute(data: string, sender?: WebSocket) {
	sockets.forEach(socket => {
		if (socket != sender) { socket.send(data); }
	});
}

channel.addEventListener("message", (event: MessageEvent) => {
	const { data } = event;
	console.log("received broadcast message", data);
	distribute(data);
});

function handleRequest(request: Request) {
	let upgrade = request.headers.get("upgrade") || "";
	if (upgrade.toLowerCase() != "websocket") {
		console.error("failed to accept websocket for url", request.url);
		return new Response("this is a websocket endpoint");
	}

	const ip = request.headers.get("x-forwarded-for");
	console.log("new websocket connection from", ip);

	const { socket, response } = Deno.upgradeWebSocket(request);

	sockets.add(socket);

	socket.addEventListener("message", (event: MessageEvent) => {
		const { data } = event;
		console.log("received socket message", data);
		distribute(data, socket);
		channel.postMessage(data);
	});

	socket.addEventListener("close", _ => {
		console.log("client disconnected");
		sockets.delete(socket);
	});

	return response;
}

await listenAndServe(":8080", handleRequest);
