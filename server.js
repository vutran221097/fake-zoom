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

  // Store room participants
  const roomParticipants = new Map();

  io.on("connection", function (socket) {
    console.log("User connected:", socket.id);

    // Handle joining a room
    socket.on("join-room", function (data) {
      const { roomId, participant } = data;
      console.log(`User ${participant.id} joining room ${roomId}`);

      socket.join(roomId);
      socket.roomId = roomId;
      socket.participantId = participant.id;

      // Store participant info
      if (!roomParticipants.has(roomId)) {
        roomParticipants.set(roomId, new Map());
      }
      roomParticipants.get(roomId).set(participant.id, {
        ...participant,
        socketId: socket.id,
      });

      // Send existing participants to the new user
      const existingParticipants = Array.from(
        roomParticipants.get(roomId).values(),
      ).filter((p) => p.id !== participant.id);

      if (existingParticipants.length > 0) {
        socket.emit("existing-participants", existingParticipants);
      }

      // Notify others in the room about new participant
      socket.to(roomId).emit("participant-joined", participant);

      const room = io.sockets.adapter.rooms.get(roomId);
      if (room) {
        console.log(`Room ${roomId} now has ${room.size} participants`);
      }
    });

    // Handle leaving a room
    socket.on("leave-room", function (data) {
      const { roomId, userId } = data;
      console.log(`User ${userId} leaving room ${roomId}`);

      // Remove from participants map
      if (roomParticipants.has(roomId)) {
        roomParticipants.get(roomId).delete(userId);
        if (roomParticipants.get(roomId).size === 0) {
          roomParticipants.delete(roomId);
        }
      }

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

    // Handle chat messages
    socket.on("chat-message", function (data) {
      const { roomId, message, userId, userName, timestamp } = data;
      console.log(
        `Chat message in room ${roomId} from ${userName}: ${message}`,
      );

      // Broadcast message to all participants in the room including sender
      io.to(roomId).emit("chat-message", {
        id: Date.now() + Math.random(),
        message,
        userId,
        userName,
        timestamp,
      });
    });

    // Handle disconnect
    socket.on("disconnect", function () {
      console.log("User disconnected:", socket.id);
      if (socket.roomId && socket.participantId) {
        // Remove from participants map
        if (roomParticipants.has(socket.roomId)) {
          roomParticipants.get(socket.roomId).delete(socket.participantId);
          if (roomParticipants.get(socket.roomId).size === 0) {
            roomParticipants.delete(socket.roomId);
          }
        }

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
