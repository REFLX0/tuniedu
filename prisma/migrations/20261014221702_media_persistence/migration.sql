-- AlterTable
ALTER TABLE "LiveChatMessage" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isQuestion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userName" TEXT,
ADD COLUMN     "userRole" TEXT,
ALTER COLUMN "isApproved" SET DEFAULT true;

-- AlterTable
ALTER TABLE "LiveParticipant" ALTER COLUMN "entitlementId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LiveSession" ADD COLUMN     "currentParticipants" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "egressId" TEXT,
ADD COLUMN     "estimatedDurationMinutes" INTEGER,
ADD COLUMN     "isFreeForTrimesterStudents" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pinnedMessage" TEXT,
ADD COLUMN     "recordingStatus" TEXT,
ADD COLUMN     "subject" TEXT,
ADD COLUMN     "viewerCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "VideoContent" ADD COLUMN     "chapterId" TEXT,
ADD COLUMN     "isFreePreview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "professorId" TEXT,
ADD COLUMN     "professorName" TEXT,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;
