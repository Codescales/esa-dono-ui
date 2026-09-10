-- Migrate payment processing from Tiltify to Stripe.
--
-- Renames Tiltify-specific columns to provider-neutral names and adds a
-- comment column to PendingPledge. Data-preserving: existing donation rows'
-- tiltify_id becomes external_id, and pending-pledge relay fields carry over.
-- (The originally auto-generated migration dropped data and failed on the
-- populated production database; this corrected version preserves it.)

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Donation: tiltify_id -> external_id (unique), preserving all data
CREATE TABLE "new_Donation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "external_id" TEXT NOT NULL,
    "donor_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "donor_name" TEXT,
    "comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Donation_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "Donor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Donation" ("id", "external_id", "donor_id", "amount_cents", "donor_name", "comment", "created_at")
    SELECT "id", "tiltify_id", "donor_id", "amount_cents", "donor_name", "comment", "created_at" FROM "Donation";
DROP TABLE "Donation";
ALTER TABLE "new_Donation" RENAME TO "Donation";
CREATE UNIQUE INDEX "Donation_external_id_key" ON "Donation"("external_id");

-- PendingPledge: relay_key_id -> checkout_session_id, relay_client_key -> checkout_url, add comment
CREATE TABLE "new_PendingPledge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pledge_token" TEXT NOT NULL,
    "donor_email" TEXT,
    "total_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "checkout_session_id" TEXT,
    "checkout_url" TEXT,
    "comment" TEXT,
    "fulfilled_by_donation_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "PendingPledge_fulfilled_by_donation_id_fkey" FOREIGN KEY ("fulfilled_by_donation_id") REFERENCES "Donation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PendingPledge" ("id", "pledge_token", "donor_email", "total_cents", "status", "checkout_session_id", "checkout_url", "comment", "fulfilled_by_donation_id", "created_at", "expires_at", "updated_at")
    SELECT "id", "pledge_token", "donor_email", "total_cents", "status", "relay_key_id", "relay_client_key", NULL, "fulfilled_by_donation_id", "created_at", "expires_at", "updated_at" FROM "PendingPledge";
DROP TABLE "PendingPledge";
ALTER TABLE "new_PendingPledge" RENAME TO "PendingPledge";
CREATE UNIQUE INDEX "PendingPledge_pledge_token_key" ON "PendingPledge"("pledge_token");
CREATE UNIQUE INDEX "PendingPledge_fulfilled_by_donation_id_key" ON "PendingPledge"("fulfilled_by_donation_id");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
