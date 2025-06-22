-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "progress" TEXT NOT NULL DEFAULT '0/0',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'No Iniciado';
