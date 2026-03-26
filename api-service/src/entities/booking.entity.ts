import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from "typeorm";

@Entity("bookings")
@Unique(["slot_id"])
export class Booking {
  @PrimaryGeneratedColumn()
  id!: number;

  // Explicit SQL type avoids runtime metadata guessing issues.
  @Column({ type: "integer" })
  slot_id!: number;

  @Column({ type: "integer" })
  user_id!: number;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;
}
