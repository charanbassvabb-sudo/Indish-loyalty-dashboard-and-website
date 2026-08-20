-- AlterTable: reservations gets a booking type (standard vs private party/family) + event type
ALTER TABLE `reservations`
  ADD COLUMN `bookingType` ENUM('STANDARD', 'PARTY') NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN `eventType` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `daily_availability` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branchId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `seatsLeft` INTEGER NULL,
    `fullyBooked` BOOLEAN NOT NULL DEFAULT false,
    `note` VARCHAR(191) NULL,
    `updatedByName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `daily_availability_branchId_date_key`(`branchId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_content` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `branchCode` ENUM('LUSAKA', 'KITWE') NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `site_content_key_branchCode_key`(`key`, `branchCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `daily_availability` ADD CONSTRAINT `daily_availability_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
