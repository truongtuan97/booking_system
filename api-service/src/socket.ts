import { Server } from 'socket.io';
import { subClient } from './config/redis.pub.sub';

let io: Server;

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    }
  });

  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  // 🔥 SUBSCRIBE EVENT
  subClient.subscribe("booking-events");

  subClient.on("message", (channel, message) => {
    if (channel === "booking-events") {
      const parsed = JSON.parse(message);

      const { socketId, event, data } = parsed;

      io.to(socketId).emit(event, data);
    }
  });
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket not initialed");
  }
  return io;
}