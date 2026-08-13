CREATE TABLE `detectionReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`sourceType` enum('text','txt','docx','pdf') NOT NULL,
	`overallScore` int NOT NULL,
	`riskLevel` enum('low','medium','high') NOT NULL,
	`charCount` int NOT NULL,
	`segmentCount` int NOT NULL,
	`modelVersion` varchar(64) NOT NULL,
	`distributionJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `detectionReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `detectionSegments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`position` int NOT NULL,
	`content` text NOT NULL,
	`score` int NOT NULL,
	`riskLevel` enum('low','medium','high') NOT NULL,
	`charCount` int NOT NULL,
	CONSTRAINT `detectionSegments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `report_user_created_idx` ON `detectionReports` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `segment_report_position_idx` ON `detectionSegments` (`reportId`,`position`);