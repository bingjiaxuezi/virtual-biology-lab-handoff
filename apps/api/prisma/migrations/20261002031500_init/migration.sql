-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentVersion" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentRun" (
    "id" TEXT NOT NULL,
    "experimentVersionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentNodeId" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExperimentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "nodeId" TEXT,
    "payload" JSONB NOT NULL,
    "stateBefore" JSONB,
    "stateAfter" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentVersion_experimentId_version_key" ON "ExperimentVersion"("experimentId", "version");

-- CreateIndex
CREATE INDEX "ExperimentEvent_runId_sequence_idx" ON "ExperimentEvent"("runId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentEvent_runId_sequence_key" ON "ExperimentEvent"("runId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetId_key" ON "Asset"("assetId");

-- AddForeignKey
ALTER TABLE "ExperimentVersion" ADD CONSTRAINT "ExperimentVersion_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentRun" ADD CONSTRAINT "ExperimentRun_experimentVersionId_fkey" FOREIGN KEY ("experimentVersionId") REFERENCES "ExperimentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperimentEvent" ADD CONSTRAINT "ExperimentEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExperimentRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
