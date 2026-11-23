-- ClaimVault MySQL 8.0 schema (the app also creates these tables automatically on startup).
CREATE DATABASE IF NOT EXISTS claimvault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE claimvault;

CREATE TABLE users (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	email VARCHAR(255) NOT NULL, 
	full_name VARCHAR(120) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	created_at DATETIME NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (email)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;


CREATE TABLE products (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	user_id INTEGER NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	brand VARCHAR(120), 
	category VARCHAR(80) NOT NULL, 
	model_number VARCHAR(120), 
	purchase_date DATE NOT NULL, 
	purchase_price NUMERIC(10, 2) NOT NULL, 
	seller VARCHAR(160), 
	order_id VARCHAR(120), 
	return_deadline DATE, 
	warranty_start DATE, 
	warranty_end DATE, 
	notes TEXT, 
	created_at DATETIME NOT NULL DEFAULT now(), 
	updated_at DATETIME NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	CONSTRAINT ck_products_price_nonneg CHECK (purchase_price >= 0), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX ix_products_user_category ON products (user_id, category);
CREATE INDEX ix_products_user_warranty_end ON products (user_id, warranty_end);

CREATE TABLE receipts (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	user_id INTEGER NOT NULL, 
	product_id INTEGER NOT NULL, 
	original_filename VARCHAR(255) NOT NULL, 
	stored_filename VARCHAR(100) NOT NULL, 
	content_type VARCHAR(100) NOT NULL, 
	size_bytes INTEGER NOT NULL, 
	uploaded_at DATETIME NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE, 
	UNIQUE (stored_filename)
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX ix_receipts_product ON receipts (product_id);
CREATE INDEX ix_receipts_user ON receipts (user_id);

CREATE TABLE reminder_acknowledgements (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	user_id INTEGER NOT NULL, 
	product_id INTEGER NOT NULL, 
	kind VARCHAR(20) NOT NULL, 
	deadline_date DATE NOT NULL, 
	acknowledged_at DATETIME NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	CONSTRAINT uq_reminder_ack UNIQUE (user_id, product_id, kind, deadline_date), 
	CONSTRAINT ck_reminder_kind CHECK (kind IN ('return','warranty')), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX ix_reminder_ack_product ON reminder_acknowledgements (product_id);

CREATE TABLE warranty_claims (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	user_id INTEGER NOT NULL, 
	product_id INTEGER NOT NULL, 
	reference_number VARCHAR(100) NOT NULL, 
	description TEXT NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	created_at DATETIME NOT NULL DEFAULT now(), 
	updated_at DATETIME NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	CONSTRAINT uq_claim_user_ref UNIQUE (user_id, reference_number), 
	CONSTRAINT ck_claim_status CHECK (status IN ('Open','Submitted','In Repair','Resolved','Rejected')), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX ix_claims_product ON warranty_claims (product_id);

CREATE TABLE claim_status_history (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	claim_id INTEGER NOT NULL, 
	old_status VARCHAR(20), 
	new_status VARCHAR(20) NOT NULL, 
	note TEXT, 
	changed_at DATETIME NOT NULL DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(claim_id) REFERENCES warranty_claims (id) ON DELETE CASCADE
)ENGINE=InnoDB CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX ix_claim_history_claim ON claim_status_history (claim_id);
