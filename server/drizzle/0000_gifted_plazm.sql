CREATE TABLE `batch` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`qty` real NOT NULL,
	`unit_buy_price` real,
	`status` text DEFAULT 'active' NOT NULL,
	`location_id` text,
	`supplier_id` text,
	`created_date` text NOT NULL,
	`stockout_date` text,
	`expiry_date` text,
	FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `count_drift` (
	`count_id` text NOT NULL,
	`item_id` text NOT NULL,
	`qty_change` real NOT NULL,
	`drift_date` text NOT NULL,
	PRIMARY KEY(`count_id`, `item_id`),
	FOREIGN KEY (`count_id`) REFERENCES `count`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `count` (
	`id` text PRIMARY KEY NOT NULL,
	`started_date` text NOT NULL,
	`finished_date` text
);
--> statement-breakpoint
CREATE TABLE `item_count` (
	`count_id` text NOT NULL,
	`item_id` text NOT NULL,
	`batch_id` text,
	`counted_qty` real NOT NULL,
	`counted_date` text NOT NULL,
	PRIMARY KEY(`count_id`, `item_id`, `batch_id`),
	FOREIGN KEY (`count_id`) REFERENCES `count`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`batch_id`) REFERENCES `batch`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `item_form` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`qty_multiplier` real NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `item` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`uom` text NOT NULL,
	`category_id` text,
	`description` text,
	`image_url` text,
	`warning_qty` real,
	`target_sale_price` real,
	`target_margin_is_percent` integer DEFAULT true NOT NULL,
	`target_margin` real,
	`default_supplier_id` text,
	`default_location_id` text,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`default_supplier_id`) REFERENCES `supplier`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`default_location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `location` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `supplier` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact_name` text,
	`phone` text,
	`email` text
);
