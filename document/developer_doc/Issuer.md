# ClaimIssuer in ERC-3643

## Introduction

The ClaimIssuer is a smart contract that acts as a trusted entity for issuing and managing claims within the ERC-3643 framework. Claims are cryptographic attestations stored in an investor's ONCHAINID (a decentralized identity contract based on ERC-734 and ERC-735 standards). These claims are essential for verifying investor eligibility during token transfers, ensuring compliance with securities regulations.

Key features of ClaimIssuer include:
- **Issuance of Claims**: Trusted issuers sign and add claims to ONCHAINIDs, confirming attributes like identity verification or jurisdictional eligibility.
- **Revocation Support**: Allows issuers to revoke invalid or expired claims.
- **Validation**: Provides methods to check claim validity, including signature recovery and revocation status.
- **Interoperability**: Multiple ClaimIssuers can be registered per token, allowing diverse KYC/AML providers to participate.

ClaimIssuers are registered in the Trusted Issuers Registry, and their claims must align with topics defined in the Claim Topics Registry (e.g., KYC as topic 42). This setup ensures that only verified investors can hold or receive security tokens, enforcing rules at the protocol level.

## How ClaimIssuer Works

In ERC-3643, compliance is enforced through a decentralized Eligibility Verification System (EVS). The ClaimIssuer plays a central role in this process:

1. **Deployment and Registration**:
   - A ClaimIssuer deploys its own ONCHAINID contract and adds a signer key (MANAGEMENT or CLAIM type) for issuing claims.
   - The token issuer registers the ClaimIssuer's ONCHAINID in the Trusted Issuers Registry, specifying authorized claim topics.

2. **Claim Issuance Process**:
   - An investor requests a claim from a trusted issuer (e.g., via off-chain KYC process).
   - The issuer signs a claim message containing:
     - The investor's ONCHAINID address.
     - Claim topic (uint256, e.g., 42 for KYC).
     - Optional data (e.g., hash of off-chain documents).
     - Validity period or scheme.
   - The signed claim is added to the investor's ONCHAINID via on-chain methods (direct addition if permitted) or hybrid approaches (off-chain signing followed by on-chain storage).

3. **Verification During Transfers**:
   - When a token transfer occurs, the Identity Registry calls `isVerified` on the receiver's wallet.
   - This checks if the receiver's ONCHAINID contains required claims from trusted issuers.
   - For each claim, the Identity Registry invokes `isClaimValid` on the ClaimIssuer to verify the signature against the issuer's ONCHAINID keys and ensure it's not revoked.
   - If all checks pass, the transfer proceeds; otherwise, it's blocked.

4. **Revocation and Management**:
   - Issuers can revoke claims if an investor's status changes (e.g., failed AML checks).
   - The system supports claim updates or expirations to maintain ongoing compliance.

This mechanism ensures automated, on-chain enforcement without relying on centralized oracles, making ERC-3643 suitable for regulated environments like security token offerings (STOs).

## Integration with ERC-3643 Components

ClaimIssuer interacts with several ERC-3643 contracts:
- **Trusted Issuers Registry**: Stores and verifies trusted ClaimIssuers and their authorized topics.
- **Claim Topics Registry**: Defines required claim topics for a token.
- **Identity Registry**: Uses ClaimIssuers for `isVerified` checks during transfers.
- **ONCHAINID (IIdentity)**: Stores claims; ClaimIssuers add/revoke claims here.
- **Token Contract (IERC3643)**: Enforces compliance by querying the Identity Registry, which relies on ClaimIssuers.

To integrate:
- Deploy a ClaimIssuer contract implementing `IClaimIssuer`.
- Register it in the Trusted Issuers Registry via the token owner/agent.
- Use off-chain tools for KYC, then issue on-chain claims.

## Examples

### Example 1: Issuing a KYC Claim
An investor passes KYC with a trusted issuer. The issuer signs a claim for topic 42 (KYC) and adds it to the investor's ONCHAINID. During a token transfer, the Identity Registry calls `isClaimValid` on the issuer's contract to confirm validity.

### Example 2: Revoking a Claim
If an investor's accreditation expires, the ClaimIssuer calls `revokeClaim` on the ONCHAINID, blocking future transfers until a new claim is issued.

For code examples, refer to the official ERC-3643 GitHub repository implementations.