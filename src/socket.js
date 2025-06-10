"use client";

import { io } from "socket.io-client";

export const socket = io("https://fake-zoom.onrender.com", {
  transports: ["websocket", "polling"],
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  forceNew: true,
  autoConnect: true,
  upgrade: true,
  rememberUpgrade: true,
});
