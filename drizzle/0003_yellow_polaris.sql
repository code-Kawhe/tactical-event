ALTER TABLE `registrations` ADD `registrationNumber` int;--> statement-breakpoint
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_registrationNumber_unique` UNIQUE(`registrationNumber`);--> statement-breakpoint
ALTER TABLE `registrations` ADD CONSTRAINT `registration_number_idx` UNIQUE(`registrationNumber`);