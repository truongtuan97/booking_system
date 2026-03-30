import "dotenv/config";
import http from 'http';
import app from "./app";
import {AppDataSource} from "./config/database";
import {initSocket} from "./socket";
import { initRedisPubSub } from "./config/redis.pub.sub";

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const startServer = async () => {
    try {
        // 1. DB
        await AppDataSource.initialize();
        console.log("✅ DB connected");

        // 2. Redis Pub/Sub
        await initRedisPubSub();
        console.log("✅ Redis Pub/Sub ready");

        // 3. Socket
        initSocket(server);
        console.log("✅ Socket.IO ready");

        // 4. Start server
        server.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

startServer();