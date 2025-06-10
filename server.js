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
    // ...
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
