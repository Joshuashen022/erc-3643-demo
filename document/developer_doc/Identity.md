# Identity in ERC-3643

## Introduction

In ERC-3643, identity is a decentralized, on-chain framework that verifies and stores user credentials to enforce compliance during token interactions. Unlike traditional ERC-20 tokens, which are permissionless, ERC-3643 tokens require users to have validated identities before they can hold or transfer assets. This system is built on ERC-734 (for key management in identities) and ERC-735 (for adding verifiable claims to identities), ensuring privacy, interoperability, and regulatory alignment.

Key aspects of identity include:
- **Decentralized Verification**: Identities are managed on-chain via smart contracts, allowing trusted parties (e.g., KYC providers) to issue claims without storing sensitive personal data directly on the blockchain.
- **Claim-Based Structure**: Claims are cryptographic proofs of attributes like investor accreditation, jurisdiction, or sanctions status, signed by authorized issuers.
- **Privacy Preservation**: Only hashes or signatures of off-chain data are stored on-chain, complying with data protection regulations like GDPR.

This identity layer transforms tokens into regulated instruments, suitable for RWAs such as real estate, bonds, or private equity.

## Decentralized Identifiers (DID) in ERC-3643

The ONCHAINID contracts in ERC-3643 serve as **decentralized identifiers (DIDs)** for users and entities. Each ONCHAINID is a unique, self-sovereign smart contract deployed on the blockchain, acting as a persistent and globally resolvable identifier for the associated wallet or participant. This aligns with the broader concept of Decentralized Identifiers as defined by the W3C, providing a portable, verifiable identity that is not controlled by any central authority.

While ONCHAINID primarily follows Ethereum-specific standards (ERC-734 and ERC-735), it embodies DID principles by enabling:
- **Self-Sovereignty**: Users control their identity contract through management keys.
- **Portability and Reusability**: The same ONCHAINID can hold claims from multiple issuers and be linked to different ERC-3643 tokens or services.
- **Verifiable Credentials**: Claims function as signed attestations, similar to Verifiable Credentials in DID ecosystems.
- **Recovery Mechanisms**: In case of lost wallet access, issuers can transfer tokens to a new address linked to the same ONCHAINID after off-chain verification.

This DID-like structure enhances interoperability, allowing identities to be reused across regulated assets while maintaining on-chain immutability and decentralization.

## How It Works

The identity system operates through a modular architecture that integrates with the token's transfer functions. When a transaction is initiated (e.g., via `transfer` or `transferFrom`), the smart contract performs real-time checks:

1. **Identity Registration**: Users create or link an ONCHAINID contract to their wallet. This contract holds keys for management and claims issued by trusted parties.
2. **Claim Issuance**: Trusted issuers (e.g., regulated entities) add claims to the user's ONCHAINID. This can occur directly (on-chain), indirectly (via requests), or hybrid (off-chain signing submitted on-chain).
3. **Verification During Transfers**: The IdentityRegistry queries the receiver's ONCHAINID to validate required claims against predefined topics (e.g., KYC status). If claims are missing, expired, or invalid, the transfer is rejected.
4. **Compliance Enforcement**: Post-identity check, the Modular Compliance contract applies additional rules, such as holding limits or jurisdictional restrictions.
5. **Recovery and Management**: If a user loses wallet access, the token issuer can recover assets by verifying off-chain data against the ONCHAINID, ensuring continuity without compromising security.

This process ensures that only eligible users can participate, preventing unauthorized transfers and enabling features like whitelisting or lockups.

## Key Components

ERC-3643's identity system comprises several interconnected smart contracts:

- **ONCHAINID**: A user-owned smart contract that serves as a unique on-chain identity. It stores:
  - Management keys for controlling access (e.g., adding/removing claims).
  - Claim signer keys from trusted issuers.
  - Verifiable claims aligned with ERC-735, which can be reused across multiple tokens or services.

- **IdentityRegistry**: A token-specific registry that maps wallet addresses to ONCHAINID addresses. It includes:
  - The Eligibility Verification System (EVS), which implements the `isVerified()` function to check claims during transfers.
  - Integration with the Claim Topics Registry (listing required claim types) and Trusted Issuers Registry (authorized claim providers).

- **Trusted Issuers Registry**: A contract storing addresses of verified claim issuers, ensuring only credible parties can validate identities.

- **Claim Topics Registry**: Defines mandatory claim topics (e.g., investor type, country of residence) for token eligibility.

These components work together to create a robust, extensible identity layer that can be customized per token issuance.

## Integration with Token Transfers

Identity is deeply integrated into ERC-3643's token mechanics to enforce permissioned behavior:

- **Transfer Hooks**: Before executing a transfer, the token contract calls the IdentityRegistry to verify both sender and receiver. This includes checking for valid ONCHAINIDs and matching claims.
- **Modular Compliance**: Identity checks feed into compliance modules, which can include rules like maximum holders per jurisdiction or minimum investment amounts.
- **Error Handling**: Non-compliant transfers revert with specific error codes, providing transparency (e.g., "Receiver not verified").
- **Use in Exchanges**: 
  - **Decentralized (DEX/AMMs)**: Liquidity pools require participants to link ONCHAINIDs; invalid trades are blocked.
  - **Centralized (CEX)**: Exchanges manage pooled ONCHAINIDs for users, ensuring deposits/withdrawals respect token rules.

This integration makes ERC-3643 compatible with existing ERC-20 interfaces while adding regulatory safeguards.

## Benefits and Use Cases

- **Regulatory Compliance**: Automates KYC/AML, sanctions screening, and investor accreditation, reducing legal risks for issuers.
- **Efficiency**: Reusable claims streamline onboarding across multiple assets, lowering costs compared to off-chain processes.
- **Security**: On-chain enforcement prevents front-running or unauthorized trades, with recovery mechanisms for lost access.
- **Interoperability**: Works with Ethereum ecosystems, supporting RWAs like tokenized securities, real estate, or funds.

Use cases include:
- Tokenizing private equity funds with investor whitelists.
- Issuing compliant stablecoins restricted by jurisdiction.
- Managing tokenized art or collectibles with ownership verification.

By leveraging identity, ERC-3643 paves the way for mainstream adoption of regulated blockchain assets.