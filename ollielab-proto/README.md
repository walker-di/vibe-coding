
**Project Overview**

OLLIELAB is a mobile application that allows users to capture physical energy/activities (referred to as "Energy in Motion" or EOT), transform these captures into digital art, mint the art as NFTs, and potentially sell these NFTs. It integrates with Google for authentication and seems to involve a payment process (PIX) for NFT sales.

**1. Sitemap / User Flow**

This represents the main paths a user can take within the application. It's based directly on your flowcharts.

*   **Authentication Flow:**
    *   Logout/Home
    *   Login Screen
    *   Google Authentication (Initiation -> Authorization)
    *   Acceptance/Consent Check
    *   Creator Page (Dashboard)

*   **Energy Capture Flow:**
    *   Creator Page -> Capture Energy
    *   Video Recording (Player -> Recording)
    *   Metadata Input (4W Dados)
    *   Save EOT
    *   Success Message (Msg Salvo)
    *   (Paths from Msg Salvo: New Capture, Edit)
    *   (Path from 4W Dados: Excluir -> back to Player)
    *   (Path from Msg Salvo (Edit): back to 4W Editar)

*   **EOT Management & Art Generation Flow:**
    *   Creator Page -> EOT
    *   EOT List Screen
    *   (Paths from EOT List: Edit, Replay, Excluir, Mint)
    *   Edit EOT -> 4W Editar (Same as 4W Dados, but for existing EOT) -> Save
    *   Replay EOT -> Replay Screen
    *   Excluir EOT (Requires confirmation - not shown but standard)
    *   Mint EOT -> Gerar Arte (Input Description/Prompt)
    *   Generate Art (Button) -> Gerar Arte (Art Preview)
    *   (Paths from Art Preview: Gerar Novamente, Mint)
    *   Mint Art -> NFT Minting Confirmation ("Aceita?")
    *   (Paths from NFT Confirmation: Sim -> Minting Process, Não -> back to Gerar Arte Preview or Gerar Arte Input)

*   **NFT Management & Sales Flow:**
    *   Creator Page -> NFT
    *   NFT List Screen (Owned / Sold)
    *   (Path from Owned List: Vender)
    *   Vender NFT -> Pagamento Screen (Price, Email, PIX details, Social Share)
    *   Disponibilizar (Button) -> Initiate Payment & Delivery
    *   Success Message (Msg Ativos Digitais Enviados)

*   **Configuration Flow:**
    *   Creator Page -> Config (Details not provided in flowcharts)

**2. Feature List**

Based on the flows, here's a breakdown of the required features:

*   **User Authentication:**
    *   Google Sign-in/Sign-up.
    *   User session management.
    *   User profile (basic - linked to Google account).

*   **Energy Capture (EOT Creation):**
    *   Access device camera and microphone.
    *   Video recording functionality (start, stop, timer).
    *   Preview recorded video.
    *   Input metadata (When, Who, What, Where) for the captured energy.
    *   Save captured video and metadata (as an EOT).
    *   Discard/Delete captured video before saving.
    *   Confirmation message upon successful save.

*   **EOT Management:**
    *   List all captured EOTs for the user.
    *   Display thumbnail/preview for each EOT.
    *   Edit metadata of an existing EOT.
    *   Play/Replay saved EOT video.
    *   Delete an EOT.

*   **AI Art Generation:**
    *   Select an EOT as inspiration (optional, prompt-based generation is also possible).
    *   Input text prompt describing the desired art/energy transformation.
    *   Select style/artist (predefined options or text input).
    *   Trigger AI model integration for image generation.
    *   Display generated art preview.
    *   Option to regenerate art with different parameters or prompt.

*   **NFT Minting:**
    *   Initiate minting process for a generated art piece (linked to an EOT).
    *   Confirmation step before minting on the blockchain.
    *   Interaction with blockchain smart contract (ERC-721 or ERC-1155).
    *   Handle wallet connection/transaction signing (or abstract this for the user).
    *   Store NFT details (token ID, contract address, metadata link) in the database.

*   **NFT Management:**
    *   List owned NFTs by the user.
    *   List NFTs previously sold by the user.
    *   Display NFT details (image, linked EOT/metadata summary, status).
    *   Option to list an owned NFT for sale.

*   **NFT Sales:**
    *   Set price for the NFT listing.
    *   Provide payment details (PIX QR Code, Key).
    *   Collect buyer information (email).
    *   Process payment (integration with payment gateway).
    *   Upon successful payment, initiate digital asset delivery (e.g., send NFT ownership/access details via email or transfer on-chain).
    *   Confirmation message after asset delivery.
    *   Social sharing options for the sale link/details.

*   **Configuration (Placeholder):**
    *   Basic settings (e.g., linked accounts, notifications - details not in flow).

**3. API Endpoints (Backend)**

These are potential RESTful API endpoints the mobile app would interact with.

*   **Authentication:**
    *   `GET /api/auth/google` - Initiate Google OAuth flow.
    *   `GET /api/auth/google/callback` - Google OAuth callback endpoint.
    *   `GET /api/users/me` - Get details of the currently authenticated user.

*   **EOTs:**
    *   `POST /api/eots` - Create a new EOT (Upload video, save metadata).
    *   `GET /api/eots` - Get list of all user's EOTs.
    *   `GET /api/eots/{id}` - Get details of a specific EOT.
    *   `PUT /api/eots/{id}` - Update metadata of an EOT.
    *   `DELETE /api/eots/{id}` - Delete an EOT.
    *   `GET /api/eots/{id}/video` - Stream or download EOT video.

*   **Art Generation:**
    *   `POST /api/art/generate` - Request AI art generation (Body: { eot_id, prompt, style, artist }). May return a job ID.
    *   `GET /api/art/{id}` - Get status and result (image URL) of an art generation job.

*   **NFTs:**
    *   `POST /api/nfts/mint` - Mint a generated art piece as an NFT (Body: { generated_art_id, eot_id, metadata }). May return a transaction ID or NFT ID.
    *   `GET /api/nfts` - Get list of user's owned NFTs (Query params: `status=owned`, `status=sold`).
    *   `GET /api/nfts/{id}` - Get details of a specific NFT.
    *   `POST /api/nfts/{id}/list-for-sale` - List an owned NFT for sale (Body: { price, currency }).
    *   `DELETE /api/nfts/{id}/unlist` - Remove an NFT from sale listing.

*   **Sales:**
    *   `POST /api/sales` - Create a new sales order for an NFT (Initiated when buyer clicks 'buy' or similar, not explicitly in flow but needed backend).
    *   `GET /api/sales/{id}` - Get details of a sale order.
    *   `POST /api/sales/{id}/process-payment` - Endpoint for payment gateway callback or processing.
    *   `POST /api/sales/{id}/deliver` - Manually trigger or confirm digital asset delivery (could be automated).

*   **Configuration:**
    *   `GET /api/config` - Get app configuration settings (less common for public API, more for admin or initial load).

*   **Files:**
    *   `POST /api/files/upload` - Generic endpoint for uploading files (videos, images) - used by EOT capture and potentially others. Returns file URL.

**4. Database Schema**

Using a relational database model (e.g., PostgreSQL, MySQL).

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY, -- Unique internal ID
    google_id VARCHAR(255) UNIQUE, -- Google user ID for auth linking
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    -- Add fields for wallet address if managed or linked later
);

-- Energy of Things (EOTs) Table
CREATE TABLE eots (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Link to the user who captured it
    video_url VARCHAR(255) NOT NULL, -- URL to the stored video file (e.g., S3, cloud storage)
    thumbnail_url VARCHAR(255), -- Optional thumbnail image URL
    recorded_at TIMESTAMP WITH TIME ZONE, -- The "When" (timestamp of the event)
    recorded_by VARCHAR(255), -- The "Who" (text field)
    activity VARCHAR(255), -- The "What" (text field)
    location VARCHAR(255), -- The "Where" (text field)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Generated Art Table
-- This stores the result of the AI generation process
CREATE TABLE generated_art (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    eot_id UUID REFERENCES eots(id) ON DELETE SET NULL, -- Optional link to inspiring EOT
    prompt TEXT, -- Text prompt used for generation
    style VARCHAR(100), -- Selected style/artist
    image_url VARCHAR(255), -- URL to the generated image file
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- e.g., 'pending', 'completed', 'failed', 'minted'
    -- Could add configuration details used by the AI model
    -- Could add metadata from the AI service response
);

-- NFTs Table
-- Represents a unique NFT asset, linked to the blockchain
CREATE TABLE nfts (
    id UUID PRIMARY KEY, -- Unique internal ID
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Current owner
    generated_art_id UUID REFERENCES generated_art(id) ON DELETE SET NULL, -- Link to the generated art
    eot_id UUID REFERENCES eots(id) ON DELETE SET NULL, -- Optional direct link to EOT if art linked it
    token_id VARCHAR(255), -- The token ID on the blockchain
    contract_address VARCHAR(255), -- The NFT contract address on the blockchain
    chain_id VARCHAR(50), -- The blockchain network ID
    metadata_url VARCHAR(255), -- URL to the NFT metadata (e.g., on IPFS)
    minted_at TIMESTAMP WITH TIME ZONE, -- Timestamp of minting
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'minted', -- e.g., 'minted', 'listed', 'sold'
    price DECIMAL(18, 2), -- Price if listed for sale
    currency VARCHAR(10), -- Currency (e.g., 'BRL', 'ETH', 'USDC')
    listed_for_sale_at TIMESTAMP WITH TIME ZONE -- Timestamp when listed
);

-- Sales Table
-- Tracks sales transactions for NFTs
CREATE TABLE sales (
    id UUID PRIMARY KEY, -- Unique internal ID for the sale
    nft_id UUID REFERENCES nfts(id) ON DELETE RESTRICT, -- The NFT being sold
    seller_id UUID REFERENCES users(id) ON DELETE RESTRICT, -- The user selling the NFT
    buyer_email VARCHAR(255), -- Email provided by the buyer
    price DECIMAL(18, 2) NOT NULL, -- Sale price
    currency VARCHAR(10) NOT NULL, -- Sale currency
    payment_method VARCHAR(50), -- e.g., 'PIX'
    payment_status VARCHAR(50) DEFAULT 'pending', -- e.g., 'pending', 'completed', 'failed'
    payment_transaction_id VARCHAR(255), -- ID from the payment gateway
    delivery_status VARCHAR(50) DEFAULT 'pending', -- e.g., 'pending', 'delivered', 'failed'
    delivered_at TIMESTAMP WITH TIME ZONE, -- Timestamp of delivery
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**5. Web3 / Blockchain Considerations**

*   **Blockchain Network:** Choose a suitable blockchain (e.g., Polygon, Flow, Solana, Celo, or even a layer 2 on Ethereum like Optimism/Arbitrum) based on transaction costs, speed, and developer ecosystem. Polygon or Flow are often good choices for apps targeting wider user adoption due to lower fees.
*   **Smart Contracts:**
    *   An ERC-721 or ERC-1155 compliant NFT contract. This contract will handle the minting and ownership tracking.
    *   Potentially a simple Marketplace contract if complex on-chain selling logic is needed, but a simpler off-chain sales process (like shown in the flow with email delivery) can be implemented first.
*   **Minting Process:** The backend will interact with the chosen blockchain network to mint the NFT via the smart contract. This requires a blockchain node (e.g., via Infura, Alchemy, or running your own) and managing a wallet/private key on the backend (carefully secured!) or integrating with user wallets (more complex UX for mobile). Given the "Disponibilizar" flow via email, server-side minting seems more likely initially.
*   **Metadata Storage:** NFT metadata (name, description, image URL, EOT link/data, attributes) should be stored on decentralized storage like IPFS or Arweave. The `metadata_url` in the `nfts` table would point to this decentralized resource. The actual video/art files (video_url, image_url) should also ideally be stored on decentralized storage and referenced in the metadata.
*   **Gas Fees:** Determine who pays for the minting transaction gas fees. The user? The platform? If the platform pays, budget for this.
*   **Digital Asset Delivery:** The flow shows delivery via email. This likely means sending the buyer a link or instructions on how to access the NFT (e.g., view on a marketplace, transfer to their wallet). If using server-side minting, the platform would transfer ownership to the buyer's wallet after payment confirmation. If using client-side minting (user connects wallet), the user would already own it, and the email confirms payment and perhaps provides sale details. The "Disponibilizar" likely means facilitating the transfer and sending confirmation.

**6. Technical Stack Recommendations**

*   **Mobile App:** React Native or Flutter for cross-platform development, or native Kotlin (Android) / Swift (iOS) for performance/platform-specific features. React Native/Flutter are often faster for initial development.
*   **Backend:** Node.js (Express/NestJS), Python (Django/Flask), Ruby on Rails, or similar web framework. Choose based on team expertise. Node.js is often chosen with React Native.
*   **Database:** PostgreSQL or MySQL are solid choices.
*   **File Storage:** AWS S3, Google Cloud Storage, or similar object storage for video and image files. For NFT assets/metadata, integrate with IPFS/Arweave via a service or library.
*   **AI Art API:** Integrate with a third-party service like OpenAI (DALL-E), Stability AI, Midjourney API (if available), or similar.
*   **Payment Gateway:** Integrate with a local provider supporting PIX (e.g., Mercado Pago, PagSeguro, or direct PIX API integration with a bank or financial institution).
*   **Blockchain Interaction:** Use libraries like Ethers.js (Ethereum/EVM chains), Web3.js, Flow-js, Solana-web3.js, etc. Use services like Infura, Alchemy, or Pocket Network for node access.
*   **Email Service:** SendGrid, AWS SES, Mailgun, etc.

**7. Implementation Phases (High-Level)**

1.  **Phase 1: Core Capture & Management**
    *   Setup project infrastructure (Backend, DB, File Storage).
    *   Implement Google Authentication.
    *   Develop Energy Capture (Video recording, metadata input, saving EOTs).
    *   Implement EOT Listing, Viewing (Replay), Editing, Deleting.
    *   Basic User Profile view.
    *   Deploy backend API and connect mobile app.

2.  **Phase 2: AI Art & Minting**
    *   Integrate with AI Art Generation API.
    *   Develop Gerar Arte input and preview screens.
    *   Implement backend logic for sending requests to AI API and handling responses.
    *   Research and choose a blockchain network and smart contract strategy.
    *   Develop NFT Smart Contract (ERC-721/1155).
    *   Implement NFT Minting logic (backend interaction with blockchain).
    *   Integrate with IPFS/Arweave for metadata/asset storage.
    *   Develop NFT Minting confirmation flow in the app.

3.  **Phase 3: NFT Management & Sales**
    *   Develop NFT Listing screens (Owned/Sold).
    *   Implement backend logic to fetch and display NFTs.
    *   Develop NFT Sales flow (Listing for sale, Pagamento screen).
    *   Integrate with Payment Gateway for PIX.
    *   Implement backend logic to handle payment confirmations.
    *   Implement Digital Asset Delivery mechanism (e.g., automated transfer + email).
    *   Develop success messages for sales/delivery.

4.  **Phase 4: Refinement & Production**
    *   Implement Configuration screen (if needed).
    *   Add error handling and edge case management.
    *   Implement robust security measures (API, database, wallet management).
    *   Performance optimization (video processing, API calls).
    *   Thorough testing (unit, integration, end-to-end).
    *   Prepare for deployment to app stores (Apple App Store, Google Play Store).
    *   Set up monitoring and logging.

This plan provides a solid foundation. Each section (API Endpoints, Database Schema) will require detailed design within the chosen technical stack, and the Web3 integration specifically needs careful consideration regarding key management, gas fees, and user experience complexity. Good luck!