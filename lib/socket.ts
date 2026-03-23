import { io } from "socket.io-client";

export const socket = io("https://mentor-platform-backend.onrender.com", {
  transports: ["websocket"], // ✅ force websocket
  withCredentials: true,
});