-- CreateTable
CREATE TABLE `spec_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoryId` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(180) NOT NULL,
    `description` TEXT NULL,
    `specsJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `spec_templates_slug_key`(`slug`),
    INDEX `spec_templates_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `products`
    ADD COLUMN `specTemplateId` INTEGER NULL,
    ADD COLUMN `technicalSpecsJson` JSON NULL;

-- CreateIndex
CREATE INDEX `products_specTemplateId_idx` ON `products`(`specTemplateId`);

-- AddForeignKey
ALTER TABLE `spec_templates` ADD CONSTRAINT `spec_templates_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_specTemplateId_fkey` FOREIGN KEY (`specTemplateId`) REFERENCES `spec_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
