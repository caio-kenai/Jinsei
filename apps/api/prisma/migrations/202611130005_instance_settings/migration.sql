ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
ALTER TABLE "User" ADD CONSTRAINT "User_role_check" CHECK ("role" IN ('user', 'admin'));
CREATE TABLE "InstanceSettings" (
  "id" TEXT NOT NULL DEFAULT 'instance',
  "name" TEXT NOT NULL DEFAULT 'Jinsei',
  "description" TEXT NOT NULL DEFAULT 'Sua biblioteca pessoal de entretenimento',
  "contactEmail" TEXT NOT NULL DEFAULT '',
  "registrationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "externalCatalogEnabled" BOOLEAN NOT NULL DEFAULT true,
  "supportEnabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstanceSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InstanceSettings_singleton_check" CHECK ("id" = 'instance')
);
