//to run this file using command and start with: node api-service/src/tests/load-test.js

import axios from 'axios';

const TOTAL_REQUESTS = 100;
const SLOT_ID = Date.now() % 100000;

async function runTest() {
  const requests = [];

  for (let i=0; i<TOTAL_REQUESTS; i++) {
    requests.push(
      axios.post("http://localhost:3000/bookings", {
        user_id: i,
        slot_id: SLOT_ID
      }).then(res => res.data)
      .catch(err => err.response?.data)
    );
  }

  const results = await Promise.all(requests);

  const success = results.filter(r => r?.id);
  const failed = results.length - success.length;
console.log(results[0]);
  console.log("Total: ", TOTAL_REQUESTS);
  console.log("Success: ", success.length);
  console.log("Failed: ", failed);
}

runTest();