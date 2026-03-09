CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `allocation_target` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolioId` text NOT NULL,
	`assetTypeId` text NOT NULL,
	`targetPercentage` real NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`portfolioId`) REFERENCES `portfolio`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assetTypeId`) REFERENCES `asset_type`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `allocation_target_portfolio_assettype_idx` ON `allocation_target` (`portfolioId`,`assetTypeId`);--> statement-breakpoint
CREATE TABLE `asset_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolioId` text NOT NULL,
	`assetId` text NOT NULL,
	`date` text NOT NULL,
	`quantity` real NOT NULL,
	`averagePrice` integer NOT NULL,
	`currentPrice` integer NOT NULL,
	`totalValue` integer NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`portfolioId`) REFERENCES `portfolio`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assetId`) REFERENCES `asset`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_snapshot_portfolio_asset_date_idx` ON `asset_snapshot` (`portfolioId`,`assetId`,`date`);--> statement-breakpoint
CREATE TABLE `asset_type` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_type_name_unique` ON `asset_type` (`name`);--> statement-breakpoint
CREATE TABLE `asset` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolioId` text NOT NULL,
	`assetTypeId` text NOT NULL,
	`ticker` text,
	`name` text NOT NULL,
	`broker` text,
	`currency` text DEFAULT 'BRL' NOT NULL,
	`maturityDate` text,
	`indexer` text,
	`indexerRate` real,
	`isActive` integer DEFAULT 1 NOT NULL,
	`stopGainPrice` real,
	`stopLossPrice` real,
	`notes` text,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`portfolioId`) REFERENCES `portfolio`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assetTypeId`) REFERENCES `asset_type`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `benchmark_value` (
	`id` text PRIMARY KEY NOT NULL,
	`benchmarkId` text NOT NULL,
	`date` text NOT NULL,
	`value` real NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`benchmarkId`) REFERENCES `benchmark`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `benchmark_value_benchmark_date_idx` ON `benchmark_value` (`benchmarkId`,`date`);--> statement-breakpoint
CREATE TABLE `benchmark` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`displayName` text NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `benchmark_name_unique` ON `benchmark` (`name`);--> statement-breakpoint
CREATE TABLE `contribution_forecast` (
	`id` text PRIMARY KEY NOT NULL,
	`sourceId` text NOT NULL,
	`yearMonth` text NOT NULL,
	`amount` integer NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`sourceId`) REFERENCES `contribution_source`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contribution_forecast_source_yearmonth_idx` ON `contribution_forecast` (`sourceId`,`yearMonth`);--> statement-breakpoint
CREATE TABLE `contribution_source` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolioId` text NOT NULL,
	`name` text NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`portfolioId`) REFERENCES `portfolio`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `emergency_reserve` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolioId` text NOT NULL,
	`targetAmount` integer NOT NULL,
	`currentAmount` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`portfolioId`) REFERENCES `portfolio`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `emergency_reserve_portfolioId_unique` ON `emergency_reserve` (`portfolioId`);--> statement-breakpoint
CREATE TABLE `family` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`createdById` text NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `family_member` (
	`id` text PRIMARY KEY NOT NULL,
	`familyId` text NOT NULL,
	`userId` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joinedAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`familyId`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `family_member_family_user_idx` ON `family_member` (`familyId`,`userId`);--> statement-breakpoint
CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`portfolioId` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`isRead` integer DEFAULT 0 NOT NULL,
	`link` text,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`portfolioId`) REFERENCES `portfolio`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `operation` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolioId` text NOT NULL,
	`assetId` text NOT NULL,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`unitPrice` integer DEFAULT 0 NOT NULL,
	`totalAmount` integer DEFAULT 0 NOT NULL,
	`fees` integer DEFAULT 0 NOT NULL,
	`brokerFrom` text,
	`brokerTo` text,
	`splitFactor` real,
	`notes` text,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`portfolioId`) REFERENCES `portfolio`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assetId`) REFERENCES `asset`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `portfolio_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolioId` text NOT NULL,
	`date` text NOT NULL,
	`totalEquity` integer NOT NULL,
	`totalInvested` integer NOT NULL,
	`profitLoss` integer NOT NULL,
	`profitLossPct` real NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`portfolioId`) REFERENCES `portfolio`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portfolio_snapshot_portfolio_date_idx` ON `portfolio_snapshot` (`portfolioId`,`date`);--> statement-breakpoint
CREATE TABLE `portfolio` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`userId` text,
	`familyId` text,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`familyId`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `project_provision` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`date` text NOT NULL,
	`amount` integer NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolioId` text NOT NULL,
	`name` text NOT NULL,
	`targetAmount` integer NOT NULL,
	`targetDate` text,
	`recurrence` text DEFAULT 'once' NOT NULL,
	`recurrenceMonth` integer,
	`isRetirement` integer DEFAULT 0 NOT NULL,
	`retirementMonthlyWithdrawal` integer,
	`ipcaRate` real,
	`priority` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`currentAmount` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`portfolioId`) REFERENCES `portfolio`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_preference` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`defaultPortfolioId` text,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`defaultPortfolioId`) REFERENCES `portfolio`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_preference_userId_unique` ON `user_preference` (`userId`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`emailVerified` text,
	`image` text,
	`passwordHash` text,
	`createdAt` text DEFAULT (current_timestamp) NOT NULL,
	`updatedAt` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` text NOT NULL,
	`token` text PRIMARY KEY NOT NULL,
	`expires` text NOT NULL
);
