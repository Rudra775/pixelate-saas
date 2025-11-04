-- CreateTable
CREATE TABLE "public"."ProcessedFrame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoName" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "brightness" DOUBLE PRECISION,
    "contrast" DOUBLE PRECISION,
    "saturation" DOUBLE PRECISION,
    "facePresence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedFrame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessedFrame_userId_createdAt_idx" ON "public"."ProcessedFrame"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProcessedFrame_status_idx" ON "public"."ProcessedFrame"("status");
