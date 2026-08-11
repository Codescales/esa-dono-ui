/*
  Warnings:

  - You are about to drop the column `tiltify_id` on the `Donation` table. All the data in the column will be lost.
  - You are about to drop the column `relay_client_key` on the `PendingPledge` table. All the data in the column will be lost.
  - You are about to drop the column `relay_key_id` on the `PendingPledge` table. All the data in the column will be lost.
  - Added the required column `external_id` to the `Donation` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
INSERT INTO "new_Donation" ("amount_cents", "comment", "created_at", "donor_id", "donor_name", "id") SELECT "amount_cents", "comment", "created_at", "donor_id", "donor_name", "id" FROM "Donation";
DROP TABLE "Donation";
ALTER TABLE "new_Donation" RENAME TO "Donation";
CREATE UNIQUE INDEX "Donation_external_id_key" ON "Donation"("external_id");
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
INSERT INTO "new_PendingPledge" ("created_at", "donor_email", "expires_at", "fulfilled_by_donation_id", "id", "pledge_token", "status", "total_cents", "updated_at") SELECT "created_at", "donor_email", "expires_at", "fulfilled_by_donation_id", "id", "pledge_token", "status", "total_cents", "updated_at" FROM "PendingPledge";
DROP TABLE "PendingPledge";
ALTER TABLE "new_PendingPledge" RENAME TO "PendingPledge";
CREATE UNIQUE INDEX "PendingPledge_pledge_token_key" ON "PendingPledge"("pledge_token");
CREATE UNIQUE INDEX "PendingPledge_fulfilled_by_donation_id_key" ON "PendingPledge"("fulfilled_by_donation_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
