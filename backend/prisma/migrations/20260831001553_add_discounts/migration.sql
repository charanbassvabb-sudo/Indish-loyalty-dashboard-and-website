-- AlterTable
ALTER TABLE `takeaway_orders` ADD COLUMN `discountId` INTEGER NULL;

-- CreateTable
CREATE TABLE `discounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('FIXED', 'PERCENTAGE') NOT NULL,
    `value` DECIMAL(10, 2) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `originalAmount` DECIMAL(10, 2) NOT NULL,
    `discountAmount` DECIMAL(10, 2) NOT NULL,
    `finalAmount` DECIMAL(10, 2) NOT NULL,
    `appliedByAdminId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `takeaway_orders_discountId_key` ON `takeaway_orders`(`discountId`);

-- AddForeignKey
ALTER TABLE `takeaway_orders` ADD CONSTRAINT `takeaway_orders_discountId_fkey` FOREIGN KEY (`discountId`) REFERENCES `discounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discounts` ADD CONSTRAINT `discounts_appliedByAdminId_fkey` FOREIGN KEY (`appliedByAdminId`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

