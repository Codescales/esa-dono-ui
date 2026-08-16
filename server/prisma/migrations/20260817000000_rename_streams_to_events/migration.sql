-- Rename the Stream concept to Event (naming only; no behavior change).
ALTER TABLE "Stream" RENAME TO "Event";
ALTER TABLE "Reward" RENAME COLUMN "stream_id" TO "event_id";
ALTER TABLE "Poll" RENAME COLUMN "stream_id" TO "event_id";
ALTER TABLE "FundGoal" RENAME COLUMN "stream_id" TO "event_id";
ALTER TABLE "Donation" RENAME COLUMN "stream_id" TO "event_id";
ALTER TABLE "PendingPledge" RENAME COLUMN "stream_id" TO "event_id";
