/*
  Warnings:

  - You are about to drop the column `lastLogin_at` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastLogin_at",
ADD COLUMN     "last_login_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "resale_tickets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "financial_profile_id" INTEGER NOT NULL,
    "event_id" TEXT,
    "ticketmaster_id" TEXT,
    "title" TEXT,
    "venue" TEXT,
    "artist" TEXT,
    "category" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "time" TIME,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "sold_quantity" INTEGER NOT NULL DEFAULT 0,
    "original_price" DECIMAL(10,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "ticket_type" TEXT NOT NULL DEFAULT 'Regular',
    "seat_info" TEXT,
    "additional_info" TEXT,
    "ticket_file" TEXT,
    "status" "ticket_status" NOT NULL DEFAULT 'pending',
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resale_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_profiles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "country_of_residence" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "dob" DATE,
    "bank_country" TEXT NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "bank_account_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_profiles_user_id_key" ON "financial_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "resale_tickets" ADD CONSTRAINT "resale_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resale_tickets" ADD CONSTRAINT "resale_tickets_financial_profile_id_fkey" FOREIGN KEY ("financial_profile_id") REFERENCES "financial_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_profiles" ADD CONSTRAINT "financial_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
