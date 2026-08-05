CREATE TABLE `businessResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`searchId` int NOT NULL,
	`name` varchar(500) NOT NULL,
	`phone` varchar(50),
	`email` varchar(320),
	`address` text,
	`website` varchar(500),
	`category` varchar(255),
	`source` enum('justdial','indiamart','linkedin','yellowpages','tradeindia','other') DEFAULT 'other',
	`rating` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `businessResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `searchHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessType` varchar(255) NOT NULL,
	`location` varchar(255) NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`resultsCount` int DEFAULT 0,
	`sources` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `searchHistory_id` PRIMARY KEY(`id`)
);
