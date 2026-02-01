const { WebSocketServer, WebSocket } = require("ws");

const WSS_KEY = "__spartaSafeWss__";

function getGlobalWss() {
  return globalThis[WSS_KEY];
}

function attachWebSocketServer(server) {
  if (getGlobalWss()) {
    return getGlobalWss();
  }

  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    socket.send(JSON.stringify({ type: "connected", ts: Date.now() }));
  });

  globalThis[WSS_KEY] = wss;
  return wss;
}

function broadcastIncidentCreated(payload) {
  const wss = getGlobalWss();
  if (!wss) return;

  const message = JSON.stringify({ type: "incident_created", payload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

module.exports = {
  attachWebSocketServer,
  broadcastIncidentCreated,
};
