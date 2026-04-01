const axios = require('axios');
const { v4: uuidv4 } = require("uuid");

const TOTAL_REQUESTS = 100000;
var SLOT_ID = 0; // Date.now() % 100000;
const URL = "http://localhost:3000/bookings";

const PORT = 3000;
const batchId = 'test-' + Date.now();
const BATCH_SIZE = 1000;

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
}

async function waitForDone() {
  while(true) {
    const res = await axios.get(`http://localhost:3000/batches/${batchId}`);
    console.log("WAITING:", res.data);

    if (res.data.processing === 0) {
      console.log("DONE:", res.data);
      break;
    }

    await new Promise(r => setTimeout(r, 1000));
  }
}

(async () => {
  await runTest();
  await waitForDone();
})(); 
