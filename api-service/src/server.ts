import "dotenv/config";
import http from 'http';
import app from "./app";
import {AppDataSource} from "./config/database";
import {initSocket} from "./socket";
import { initRedisPubSub } from "./config/redis.pub.sub";

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

initSocket(server);

AppDataSource.initialize().then(() => {
    server.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });

    initRedisPubSub(); // 🔥 QUAN TRỌNG
}).catch((error) => {
    console.error("Failed to connect to database:", error);
    process.exit(1);
});
