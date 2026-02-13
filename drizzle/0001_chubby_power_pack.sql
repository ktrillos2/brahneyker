CREATE TABLE `conversation_state` (
	`phone` text PRIMARY KEY NOT NULL,
	`step` text DEFAULT 'IDLE',
	`temp_data` text,
	`last_updated` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `daily_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`stylist` text NOT NULL,
	`client_name` text,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`invoice_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `daily_product_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`invoice_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`product_id` text,
	`product_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`price` real NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_invoice_items`("id", "invoice_id", "product_id", "product_name", "quantity", "price") SELECT "id", "invoice_id", "product_id", "product_name", "quantity", "price" FROM `invoice_items`;--> statement-breakpoint
DROP TABLE `invoice_items`;--> statement-breakpoint
ALTER TABLE `__new_invoice_items` RENAME TO `invoice_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `appointments` ADD `client_name` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `client_phone` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `service_type` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `service_detail` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `type` text DEFAULT 'general' NOT NULL;