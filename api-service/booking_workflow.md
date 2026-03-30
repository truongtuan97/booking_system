Distributed Booking System - Phase 1 to Phase 5 Workflow

# Phase 1: Basic API

Client sends request → Controller → Service → Database (PostgreSQL).  
Handles basic CRUD operations.  
Issue: Vulnerable to double booking and high concurrency problems.

# Phase 2: Database Protection

Added UNIQUE constraint on slot_id.  
Ensures no duplicate booking at DB level.  
Issue: Still high load on DB under heavy traffic.

# Phase 3: Queue System (BullMQ + Redis)

Client → API → enqueue job → Worker → DB.  
API returns 202 Accepted.  
Worker processes booking asynchronously.  
Prevents DB overload and smooths traffic spikes.

# Phase 4: Real-time Feedback (WebSocket)

Worker → Redis Pub/Sub → API → Socket.IO → Client.  
Client receives booking-success or booking-failed event.  
Improves user experience with real-time updates.

# Phase 5: Distributed System (Multi-instance + Redis Adapter)

Multiple API instances (3000, 3001).  
Socket.IO Redis Adapter syncs events across instances.  
Worker publishes event → all instances receive.  
Correct instance delivers event to connected client.  
Achieves horizontal scaling and stateless architecture.