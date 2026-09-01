-- AlterTable
ALTER TABLE `admins` RENAME COLUMN `email` TO `username`;
ALTER TABLE `admins` RENAME INDEX `admins_email_key` TO `admins_username_key`;
