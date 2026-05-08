ALTER TABLE `registrations` ADD `cpf` varchar(14) NOT NULL;--> statement-breakpoint
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_cpf_unique` UNIQUE(`cpf`);--> statement-breakpoint
ALTER TABLE `registrations` ADD CONSTRAINT `cpf_idx` UNIQUE(`cpf`);