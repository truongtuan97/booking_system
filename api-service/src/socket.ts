import { Server } from 'socket.io';
import { subClient as redisSubClient } from './config/redis.pub.sub';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

const PORT = process.env.PORT;

let io: Server;

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    }
  });

  // 🔥 Redis adapter (cho multi-instance)
  const pubClient = new Redis();
  const subClient = pubClient.duplicate();
  
  io.adapter(createAdapter(pubClient, subClient));
  console.log("✅ Socket.IO Redis Adapter connected");

  io.on("connection", (socket) => {
    console.log(`🔌 [PORT: ${PORT}] Client connected:`, socket.id);

    socket.on("disconnect", () => {
      console.log(`❌ [PORT: ${PORT}] Client disconnected:`, socket.id);
    });
  });

  // 🔥 SUBSCRIBE EVENT
  redisSubClient.subscribe("booking-events");

  redisSubClient.on("message", (channel, message) => {
    if (channel === "booking-events") {
      try {
        const parsed = JSON.parse(message);

        const { socketId, event, data } = parsed;

        console.log(`📡 [PORT: ${PORT}] Emitting event to socket:`, socketId, event, data);
        io.to(socketId).emit(event, data);
      } catch (error) {
        console.error(`❌ [PORT: ${PORT}] Error parsing message:`, error);
      }
    }
  });
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket not initialed");
  }
  return io;
}