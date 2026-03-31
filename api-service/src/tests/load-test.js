const axios = require('axios');
const { v4: uuidv4 } = require("uuid");

const TOTAL_REQUESTS = 20000;
var SLOT_ID = 0; // Date.now() % 100000;
const URL = "http://localhost:3000/bookings";

const PORT = 3000;
const batchId = 'test-' + Date.now();
const BATCH_SIZE = 100;

async function sendRequest(i) {
  try {
    const res = await axios.post(URL, {
      user_id: 1,
      slot_id: 1000 + (i % 100),
      socketId: "fake-socket",
      batchId
    }, {
      headers: {
        "idempotency-key": uuidv4()
      }
    });
    return res.status;
  } catch (error) {
    if (error.response) {
      return error.response.status;
    }
    return "ERR";
  }
}

async function runTest() {
  let results = [];

  console.log("start: ", Date.now());

  for (let i = 0; i < TOTAL_REQUESTS; i += BATCH_SIZE) {
    const chunk = [];

    for (let j = i; j < i + BATCH_SIZE && j < TOTAL_REQUESTS; j++) {
      chunk.push(sendRequest(j));
    }

    const chunkResults = await Promise.all(chunk);
    results = results.concat(chunkResults);
  }

  const stats = results.reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  console.log("📊 REQUEST RESULT:", stats);
  console.log("End: ", Date.now());

  setTimeout(async () => {
    const res = await axios.get(`http://localhost:3000/batches/${batchId}`);
    console.log("📊 FINAL BATCH RESULT:", res.data);
  }, 5000);
}

runTest();