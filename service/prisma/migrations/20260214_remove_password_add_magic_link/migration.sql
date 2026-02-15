-- Remove password column from users table
ALTER TABLE "users" DROP COLUMN "password";

-- Create authentication_attempts table for magic link tokens
CREATE TABLE "authentication_attempts" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authentication_attempts_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "authentication_attempts_token_key" ON "authentication_attempts"("token");
CREATE INDEX "authentication_attempts_token_idx" ON "authentication_attempts"("token");
CREATE INDEX "authentication_attempts_email_idx" ON "authentication_attempts"("email");
CREATE INDEX "authentication_attempts_expiresAt_idx" ON "authentication_attempts"("expiresAt");
