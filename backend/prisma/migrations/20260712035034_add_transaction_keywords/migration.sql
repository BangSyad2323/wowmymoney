-- CreateTable
CREATE TABLE "transaction_keywords" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "transaction_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_keywords_keyword_key" ON "transaction_keywords"("keyword");
