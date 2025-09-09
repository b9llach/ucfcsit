-- AlterTable
ALTER TABLE "public"."courses" ADD COLUMN     "description" TEXT,
ADD COLUMN     "elective_level" TEXT,
ADD COLUMN     "is_elective" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "note" TEXT;
