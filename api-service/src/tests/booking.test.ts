import request from "supertest";
import { AppDataSource } from '../config/database';
import app from "../app";

beforeAll(async () => {
  await AppDataSource.initialize();
});

afterAll(async () => {
  await AppDataSource.destroy();
});

describe("Bookings API", () => {
  let bookingId: number;

  it ("should create a booking", async () => {
    // Use a unique slot_id because `Booking` enforces UNIQUE(slot_id)
    const res = await request(app)
      .post("/bookings")
      .send({ slot_id: Date.now() % 100000, user_id: 100 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    bookingId = res.body.id;
  });

  it ("should get bookings", async () => {
    const res = await request(app).get("/bookings");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it ("should update booking", async () => {
    let slot_id = Date.now() % 100000
    const res = await request(app).put(`/bookings/${bookingId}`).send({ slot_id: slot_id, user_id: 101 });
    expect(res.status).toBe(200);
    expect(res.body.slot_id).toBe(slot_id);
  });

  it ("should delete a booking", async () => {
    const res = await request(app).delete(`/bookings/${bookingId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Booking delete sucessfully.")
  })
});