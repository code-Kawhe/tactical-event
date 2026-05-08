ALTER TABLE `registrations` ADD `paymentStatus` enum('pending','confirmed') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD `totalAmount` int DEFAULT 5000 NOT NULL;