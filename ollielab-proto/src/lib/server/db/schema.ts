import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'; // Add real for decimal type
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2'; // For generating IDs

// --- Lucia Auth Tables ---

export const userTable = sqliteTable('user', {
	id: text('id').primaryKey(), // Lucia requires text ID
	email: text('email').notNull().unique(),
	name: text('name') // Optional: Add other user details here
	// Add other fields like email_verified if needed
});

export const sessionTable = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id),
	expiresAt: integer('expires_at').notNull() // Unix timestamp (seconds)
});

export const keyTable = sqliteTable('key', {
	id: text('id').primaryKey(), // Format: "provider:provider_user_id" e.g., "email:user@example.com"
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id),
	hashedPassword: text('hashed_password') // Store hashed password if using password strategy
	// Add other fields if using different key providers (e.g., oauth tokens)
});

// --- Application Tables ---

export const eotsTable = sqliteTable('eots', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()), // Use CUID2 for unique IDs
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }), // Link to the user who captured it
	videoUrl: text('video_url').notNull(), // URL to the stored video file
	thumbnailUrl: text('thumbnail_url'), // Optional thumbnail image URL
	recordedAt: integer('recorded_at'), // The "When" (Unix timestamp)
	recordedBy: text('recorded_by'), // The "Who" (text field)
	activity: text('activity'), // The "What" (text field)
	location: text('location'), // The "Where" (text field)
	createdAt: integer('created_at')
		.notNull()
		.$defaultFn(() => Math.floor(Date.now() / 1000)), // Unix timestamp (seconds)
	updatedAt: integer('updated_at')
		.notNull()
		.$defaultFn(() => Math.floor(Date.now() / 1000)) // Unix timestamp (seconds)
		.$onUpdate(() => Math.floor(Date.now() / 1000)) // Update timestamp on modification
});

export const generatedArtTable = sqliteTable('generated_art', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()), // Use CUID2 for unique IDs
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }), // Link to the user who generated it
	eotId: text('eot_id').references(() => eotsTable.id, { onDelete: 'set null' }), // Optional link to inspiring EOT
	prompt: text('prompt'), // Text prompt used for generation
	style: text('style'), // Selected style/artist
	imageUrl: text('image_url'), // URL to the generated image file
	status: text('status').default('pending'), // e.g., 'pending', 'completed', 'failed', 'minted'
	generatedAt: integer('generated_at')
		.notNull()
		.$defaultFn(() => Math.floor(Date.now() / 1000)) // Unix timestamp (seconds)
});

export const nftsTable = sqliteTable('nfts', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()), // Unique internal ID
	userId: text('user_id') // Current owner - Nullable if sold/transferred outside platform? Let's keep NOT NULL for now.
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }),
	generatedArtId: text('generated_art_id')
		.references(() => generatedArtTable.id, { onDelete: 'set null' }), // Link to the generated art
	eotId: text('eot_id').references(() => eotsTable.id, { onDelete: 'set null' }), // Optional direct link to EOT
	tokenId: text('token_id'), // The token ID on the blockchain
	contractAddress: text('contract_address'), // The NFT contract address
	chainId: text('chain_id'), // The blockchain network ID
	metadataUrl: text('metadata_url'), // URL to the NFT metadata (e.g., on IPFS)
	mintedAt: integer('minted_at'), // Timestamp of minting (Unix timestamp)
	status: text('status').default('minted'), // e.g., 'minted', 'listed', 'sold'
	price: real('price'), // Price if listed for sale (use REAL for SQLite decimals)
	currency: text('currency'), // Currency (e.g., 'BRL', 'ETH', 'USDC')
	listedForSaleAt: integer('listed_for_sale_at'), // Timestamp when listed (Unix timestamp)
	createdAt: integer('created_at')
		.notNull()
		.$defaultFn(() => Math.floor(Date.now() / 1000)), // Unix timestamp (seconds)
	updatedAt: integer('updated_at')
		.notNull()
		.$defaultFn(() => Math.floor(Date.now() / 1000)) // Unix timestamp (seconds)
		.$onUpdate(() => Math.floor(Date.now() / 1000))
});

// --- Sales Table ---
// Tracks sales transactions for NFTs
export const salesTable = sqliteTable('sales', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()), // Unique internal ID for the sale
	nftId: text('nft_id')
		.notNull()
		.references(() => nftsTable.id, { onDelete: 'restrict' }), // The NFT being sold
	sellerId: text('seller_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'restrict' }), // The user selling the NFT
	buyerEmail: text('buyer_email'), // Email provided by the buyer
	price: real('price').notNull(), // Sale price
	currency: text('currency').notNull(), // Sale currency
	paymentMethod: text('payment_method'), // e.g., 'PIX'
	paymentStatus: text('payment_status').default('pending'), // e.g., 'pending', 'completed', 'failed'
	paymentTransactionId: text('payment_transaction_id'), // ID from the payment gateway
	deliveryStatus: text('delivery_status').default('pending'), // e.g., 'pending', 'delivered', 'failed'
	deliveredAt: integer('delivered_at'), // Timestamp of delivery (Unix timestamp)
	createdAt: integer('created_at')
		.notNull()
		.$defaultFn(() => Math.floor(Date.now() / 1000)), // Unix timestamp (seconds)
	updatedAt: integer('updated_at')
		.notNull()
		.$defaultFn(() => Math.floor(Date.now() / 1000)) // Unix timestamp (seconds)
		.$onUpdate(() => Math.floor(Date.now() / 1000))
});


// --- Relations ---

export const userRelations = relations(userTable, ({ many }) => ({
	sessions: many(sessionTable),
	keys: many(keyTable),
	eots: many(eotsTable),
	generatedArt: many(generatedArtTable),
	nftsOwned: many(nftsTable, { relationName: 'owner' }), // NFTs currently owned by the user
	salesMade: many(salesTable, { relationName: 'seller' }) // Sales initiated by the user
}));

export const sessionRelations = relations(sessionTable, ({ one }) => ({
	user: one(userTable, {
		fields: [sessionTable.userId],
		references: [userTable.id]
	})
}));

export const keyRelations = relations(keyTable, ({ one }) => ({
	user: one(userTable, {
		fields: [keyTable.userId],
		references: [userTable.id]
	})
}));

export const eotsRelations = relations(eotsTable, ({ one, many }) => ({
	user: one(userTable, {
		fields: [eotsTable.userId],
		references: [userTable.id]
	}),
	generatedArt: many(generatedArtTable),
	nfts: many(nftsTable)
}));

export const generatedArtRelations = relations(generatedArtTable, ({ one, many }) => ({
	user: one(userTable, {
		fields: [generatedArtTable.userId],
		references: [userTable.id]
	}),
	eot: one(eotsTable, {
		fields: [generatedArtTable.eotId],
		references: [eotsTable.id]
	}),
	nfts: many(nftsTable)
}));

export const nftsRelations = relations(nftsTable, ({ one, many }) => ({ // Updated relation
	owner: one(userTable, { // Renamed for clarity
		fields: [nftsTable.userId],
		references: [userTable.id],
		relationName: 'owner'
	}),
	generatedArt: one(generatedArtTable, {
		fields: [nftsTable.generatedArtId],
		references: [generatedArtTable.id]
	}),
	eot: one(eotsTable, {
		fields: [nftsTable.eotId],
		references: [eotsTable.id]
	}),
	sales: many(salesTable) // An NFT can be involved in multiple sale attempts/records
}));

// Add relations for the new salesTable
export const salesRelations = relations(salesTable, ({ one }) => ({
	nft: one(nftsTable, {
		fields: [salesTable.nftId],
		references: [nftsTable.id]
	}),
	seller: one(userTable, {
		fields: [salesTable.sellerId],
		references: [userTable.id],
		relationName: 'seller' // Explicit relation name
	})
	// Note: Buyer is identified by email, not a direct user relation here
}));
