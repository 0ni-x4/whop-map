-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "bizName" TEXT NOT NULL,
    "bizId" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Experience_id_key" ON "Experience"("id");
