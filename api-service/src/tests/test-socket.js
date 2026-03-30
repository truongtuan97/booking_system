//to run this file using command and start with: node api-service/src/tests/test-socket.js

// for i in {1..20}; do node src/tests/test-socket.js & done
// wait
const { io } = require("socket.io-client");
const axios = require("axios");

const PORTS = [3000, 3001];
const PORT = PORTS[Math.floor(Math.random() * PORTS.length)];
const socket = io(`http://localhost:${PORT}`);

console.log("Connecting to port:", PORT);

socket.on("connect", async () => {
  console.log("Connected: ", socket.id);

  try {
    const res = await axios.post(`http://localhost:${PORT}/bookings`, {
      user_id: 1,
      slot_id: Date.now() % 100000,
      socketId: socket.id
    });

    console.log("Job created: ", res.data);
  } catch (err) {
    if (err.response) {
      console.log("❌ API ERROR:", err.response.status, err.response.data);
    } else {
      console.log("❌ UNKNOWN ERROR:", err.message);
    }
  }
});

socket.on("booking-success", (data) => {
  console.log("🎉 SUCCESS:", data);

  socket.disconnect();   // 🔥 QUAN TRỌNG
  process.exit(0);       // 🔥 EXIT PROCESS
});

socket.on("booking-failed", (err) => {
  console.log("❌ FAILED:", err);

  socket.disconnect();
  process.exit(0);
});