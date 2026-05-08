CREATE TABLE `registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`familyPhone` varchar(20) NOT NULL,
	`isAdult` boolean NOT NULL,
	`team` enum('FORCA_INTERVENCAO','MILICIA_LOCAL') NOT NULL,
	`wantsPatch` boolean NOT NULL DEFAULT false,
	`wantsShirt` boolean NOT NULL DEFAULT false,
	`shirtSize` enum('P','M','G','GG'),
	`hasCompanion` boolean NOT NULL DEFAULT false,
	`companionCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registrations_id` PRIMARY KEY(`id`)
);
