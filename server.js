var http = require("http");
var next = require("next");
var Server = require("socket.io").Server;

var dev = process.env.NODE_ENV !== "production";
var hostname = "localhost";
var port = 3000;
// when using middleware `hostname` and `port` must be provided below
var app = next({ dev: dev, hostname: hostname, port: port });
var handler = app.getRequestHandler();

app.prepare().then(function () {
  var httpServer = http.createServer(handler);

  var io = new Server(httpServer);

  io.on("connection", function (socket) {
    console.log("User connected:", socket.id);

    // Handle joining a room
    socket.on("join-room", function (data) {
      const { roomId, participant } = data;
      console.log(`User ${participant.id} joining room ${roomId}`);

      socket.join(roomId);
      socket.roomId = roomId;
      socket.participantId = participant.id;

      // Notify others in the room
      socket.to(roomId).emit("participant-joined", participant);

      // Send current participants to the new user
      const room = io.sockets.adapter.rooms.get(roomId);
      if (room) {
        console.log(`Room ${roomId} now has ${room.size} participants`);
      }
    });

    // Handle leaving a room
    socket.on("leave-room", function (data) {
      const { roomId, userId } = data;
      console.log(`User ${userId} leaving room ${roomId}`);

      socket.leave(roomId);
      socket.to(roomId).emit("participant-left", userId);
    });

    // Handle WebRTC signaling
    socket.on("signal", function (data) {
      console.log(`Signaling from ${data.from} to ${data.to}:`, data.type);
      socket.to(data.roomId).emit("signal", data);
    });

    // Handle participant updates (audio/video/screen share status)
    socket.on("participant-update", function (data) {
      const { roomId, participant } = data;
      console.log(`Participant ${participant.id} updated in room ${roomId}`);
      socket.to(roomId).emit("participant-updated", participant);
    });

    // Handle talking status
    socket.on("talking", function (data) {
      const { roomId, userId, isTalking } = data;
      socket.to(roomId).emit("talking", { userId, roomId, isTalking });
    });

    // Handle disconnect
    socket.on("disconnect", function () {
      console.log("User disconnected:", socket.id);
      if (socket.roomId && socket.participantId) {
        socket.to(socket.roomId).emit("participant-left", socket.participantId);
      }
    });
  });

  httpServer
    .once("error", function (err) {
      console.error(err);
      process.exit(1);
    })
    .listen(port, function () {
      console.log("> Ready on http://" + hostname + ":" + port);
    });
});
