import request from "supertest";
import { AppDataSource } from '../config/database';
import app from "../app";
import { redisClient } from "../config/redis";

beforeAll(async () => {
  await AppDataSource.initialize();
});

afterAll(async () => {
  await redisClient.quit();              // ← thêm dòng này
  await AppDataSource.destroy();
});

describe("Bookings API", () => {
  let bookingId: number;
  let slot_id: number;

  slot_id = Date.now() % 100000

  it ("should create a booking", async () => {
    // Use a unique slot_id because `Booking` enforces UNIQUE(slot_id)
    const res = await request(app)
      .post("/bookings")
      .send({ slot_id: slot_id, user_id: 100 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    bookingId = res.body.id;
  });

  it ("failed when book the same slot", async () => {
    const res = await request(app).post("/bookings").send({ slot_id: slot_id, user_id: 102});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Slot already booked");
  });

  it ("should get bookings", async () => {
    const res = await request(app).get("/bookings");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it ("should update booking", async () => {
    slot_id = Date.now() % 100000
    const res = await request(app).put(`/bookings/${bookingId}`).send({ slot_id: slot_id, user_id: 101 });
    expect(res.status).toBe(200);
    expect(res.body.slot_id).toBe(slot_id);
  });

  it ("should delete a booking", async () => {
    const res = await request(app).delete(`/bookings/${bookingId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Booking delete sucessfully.")
  });

  it ("should handle 100 concurrent booking requests", async () => {
    const slot_id = Date.now() % 100000;

    const requests = [];

    for (let i=0; i<100; i++) {
      requests.push(
        request(app)
          .post("/bookings")
          .send({ slot_id, user_id: i})
          .then(res => res)
          .catch(err => err.response)
      );
    }

    const results = await Promise.all(requests);

    const success = results.filter(r => r.status === 201);
    const failed = results.filter(r => r.status !== 201);

    console.log("Success", success.length);
    console.log("Failed", failed.length);

    expect(success.length).toBe(1);
    expect(failed.length).toBe(99);
  })
});