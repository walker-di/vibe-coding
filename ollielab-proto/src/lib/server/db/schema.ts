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

// --- Generated Art Table ---
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

// --- NFTs Table ---
// Represents a unique NFT asset, linked to the blockchain
export const nftsTable = sqliteTable('nfts', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()), // Unique internal ID
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id, { onDelete: 'cascade' }), // Current owner
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


// --- Relations ---

export const userRelations = relations(userTable, ({ many }) => ({
	sessions: many(sessionTable),
	keys: many(keyTable),
	eots: many(eotsTable),
	generatedArt: many(generatedArtTable),
	nfts: many(nftsTable) // Add relation from user to NFTs
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
	nfts: many(nftsTable) // Add relation from EOT to NFTs
}));

export const generatedArtRelations = relations(generatedArtTable, ({ one, many }) => ({ // Update relation
	user: one(userTable, {
		fields: [generatedArtTable.userId],
		references: [userTable.id]
	}),
	eot: one(eotsTable, {
		fields: [generatedArtTable.eotId],
		references: [eotsTable.id]
	}),
	nfts: many(nftsTable) // Add relation from Generated Art to NFTs
}));

// Add relations for the new nftsTable
export const nftsRelations = relations(nftsTable, ({ one }) => ({
	user: one(userTable, { // Owner
		fields: [nftsTable.userId],
		references: [userTable.id]
	}),
	generatedArt: one(generatedArtTable, { // Source Art
		fields: [nftsTable.generatedArtId],
		references: [generatedArtTable.id]
	}),
	eot: one(eotsTable, { // Optional Source EOT
		fields: [nftsTable.eotId],
		references: [eotsTable.id]
	})
	// Add relation to Sales table later
}));
