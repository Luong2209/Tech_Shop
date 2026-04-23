-- CreateTable
CREATE TABLE `payment_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `provider` VARCHAR(120) NULL,
    `termMonths` INTEGER NOT NULL,
    `interestRate` DECIMAL(5, 2) NULL,
    `downPayment` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `monthlyAmount` DECIMAL(12, 2) NOT NULL,
    `totalPayable` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING', 'PARTIAL', 'COMPLETED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_plans_orderId_key`(`orderId`),
    INDEX `payment_plans_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_plans` ADD CONSTRAINT `payment_plans_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
