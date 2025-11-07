-- CreateTable
CREATE TABLE "socket_security_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "socketId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "socket_security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "socket_security_events_userId_createdAt_idx" ON "socket_security_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "socket_security_events_type_createdAt_idx" ON "socket_security_events"("type", "createdAt");

-- CreateIndex
CREATE INDEX "socket_security_events_ip_createdAt_idx" ON "socket_security_events"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "socket_security_events_socketId_idx" ON "socket_security_events"("socketId");
