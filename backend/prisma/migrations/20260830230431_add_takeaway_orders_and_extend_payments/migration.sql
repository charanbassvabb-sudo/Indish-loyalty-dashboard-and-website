-- DropForeignKey
ALTER TABLE `payment_attempts` DROP FOREIGN KEY `payment_attempts_reservationId_fkey`;

-- AlterTable
ALTER TABLE `payment_attempts` ADD COLUMN `takeawayOrderId` INTEGER NULL,
    MODIFY `reservationId` INTEGER NULL;

-- CreateTable
CREATE TABLE `takeaway_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reference` VARCHAR(191) NOT NULL,
    `branchId` INTEGER NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `pickupDate` DATE NOT NULL,
    `pickupTime` VARCHAR(191) NOT NULL,
    `subtotalAmount` DECIMAL(10, 2) NOT NULL,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `takeaway_orders_reference_key`(`reference`),
    INDEX `takeaway_orders_branchId_status_idx`(`branchId`, `status`),
    INDEX `takeaway_orders_status_idx`(`status`),
    INDEX `takeaway_orders_pickupDate_idx`(`pickupDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `takeaway_order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `menuItemId` INTEGER NULL,
    `nameSnapshot` VARCHAR(191) NOT NULL,
    `priceVariantLabel` VARCHAR(191) NULL,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `spiceLevel` ENUM('MILD', 'MEDIUM', 'HOT') NULL,
    `lineTotal` DECIMAL(10, 2) NOT NULL,

    INDEX `takeaway_order_items_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `payment_attempts_takeawayOrderId_idx` ON `payment_attempts`(`takeawayOrderId`);

-- AddForeignKey
ALTER TABLE `takeaway_orders` ADD CONSTRAINT `takeaway_orders_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `takeaway_order_items` ADD CONSTRAINT `takeaway_order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `takeaway_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `takeaway_order_items` ADD CONSTRAINT `takeaway_order_items_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_attempts` ADD CONSTRAINT `payment_attempts_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_attempts` ADD CONSTRAINT `payment_attempts_takeawayOrderId_fkey` FOREIGN KEY (`takeawayOrderId`) REFERENCES `takeaway_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
