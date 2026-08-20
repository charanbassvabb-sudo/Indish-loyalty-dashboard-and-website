-- DropForeignKey
ALTER TABLE `payments` DROP FOREIGN KEY `payments_reservationId_fkey`;

-- DropTable
DROP TABLE `payments`;

-- CreateTable
CREATE TABLE `payment_attempts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reservationId` INTEGER NOT NULL,
    `provider` ENUM('AIRTEL_MONEY', 'MTN_MOMO', 'ZAMTEL_KWACHA') NOT NULL,
    `expectedAmount` DECIMAL(10, 2) NOT NULL,
    `expectedRecipient` VARCHAR(191) NOT NULL,
    `screenshotPath` VARCHAR(191) NOT NULL,
    `screenshotMime` VARCHAR(191) NOT NULL,
    `ocrRawText` TEXT NULL,
    `extractedAmount` DECIMAL(10, 2) NULL,
    `extractedTransactionId` VARCHAR(191) NULL,
    `extractedSender` VARCHAR(191) NULL,
    `extractedRecipient` VARCHAR(191) NULL,
    `extractedDate` VARCHAR(191) NULL,
    `extractedTime` VARCHAR(191) NULL,
    `extractedStatus` VARCHAR(191) NULL,
    `matchAmount` BOOLEAN NULL,
    `matchRecipient` BOOLEAN NULL,
    `matchStatus` BOOLEAN NULL,
    `matchRecency` BOOLEAN NULL,
    `matchNotDuplicate` BOOLEAN NULL,
    `confidenceScore` INTEGER NULL,
    `status` ENUM('PROCESSING', 'AUTO_VERIFIED', 'REQUIRES_REVIEW', 'APPROVED', 'REJECTED', 'DUPLICATE', 'PAYMENT_FAILED') NOT NULL DEFAULT 'PROCESSING',
    `verificationMethod` ENUM('SCREENSHOT_OCR', 'MANUAL', 'AIRTEL_API', 'MTN_API') NOT NULL DEFAULT 'SCREENSHOT_OCR',
    `reviewedByAdminId` INTEGER NULL,
    `reviewNotes` TEXT NULL,
    `reviewedAt` DATETIME(3) NULL,
    `internalPaymentId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_attempts_internalPaymentId_key`(`internalPaymentId`),
    INDEX `payment_attempts_extractedTransactionId_idx`(`extractedTransactionId`),
    INDEX `payment_attempts_reservationId_idx`(`reservationId`),
    INDEX `payment_attempts_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_attempts` ADD CONSTRAINT `payment_attempts_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_attempts` ADD CONSTRAINT `payment_attempts_reviewedByAdminId_fkey` FOREIGN KEY (`reviewedByAdminId`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
