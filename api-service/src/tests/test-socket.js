//to run this file using command and start with: node api-service/src/tests/test-socket.js
const { io } = require("socket.io-client");
const axios = require("axios");

const socket = io("http://localhost:3000");

socket.on("connect", async () => {
  console.log("Connected: ", socket.id);

  const res = await axios.post("http://localhost:3000/bookings", {
    user_id: 1,
    slot_id: Date.now() % 100000,
    socketId: socket.id
  });

  console.log("Job created: ", res.data);
});

socket.on("booking-success", (data) => {
  console.log("🎉 SUCCESS:", data);
});

socket.on("booking-failed", (err) => {
  console.log("❌ FAILED:", err);
});