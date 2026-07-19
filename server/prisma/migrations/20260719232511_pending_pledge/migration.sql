-- CreateTable
CREATE TABLE "PendingPledge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pledge_token" TEXT NOT NULL,
    "donor_email" TEXT,
    "total_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "relay_key_id" TEXT,
    "relay_client_key" TEXT,
    "fulfilled_by_donation_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "PendingPledge_fulfilled_by_donation_id_fkey" FOREIGN KEY ("fulfilled_by_donation_id") REFERENCES "Donation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PledgeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pledge_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "poll_id" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PledgeItem_pledge_id_fkey" FOREIGN KEY ("pledge_id") REFERENCES "PendingPledge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingPledge_pledge_token_key" ON "PendingPledge"("pledge_token");

-- CreateIndex
CREATE UNIQUE INDEX "PendingPledge_fulfilled_by_donation_id_key" ON "PendingPledge"("fulfilled_by_donation_id");
