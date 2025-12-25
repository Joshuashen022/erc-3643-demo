# Claim Topics | ERC-3643

## Introduction

Claim topics are standardized identifiers (represented as uint256 values) that specify the attributes or qualifications an investor must possess to hold or receive ERC-3643 tokens. They are managed through a dedicated Claim Topics Registry and integrated into the identity verification process to automate compliance checks during token operations, such as transfers.

Claim topics act as hooks into an investor's on-chain identity, linking to verifiable claims issued by trusted parties. This allows token issuers to customize eligibility criteria without modifying the core token contract. For example, an issuer might require claims for KYC compliance, investor accreditation, or jurisdictional residency.

Key features of claim topics include:
- **Mandatory Requirements**: Defined per token, claim topics outline the essential claims an investor's identity must hold to be verified.
- **Verification Points**: Checked automatically via the Identity Registry during transfers, ensuring only eligible addresses can receive tokens.
- **Flexibility**: Issuers can add, remove, or update topics to adapt to evolving regulations or token-specific rules.
- **Examples of Use Cases**:
  - Implementing anti-money laundering (AML) checks by requiring a KYC claim topic.
  - Enforcing investor accreditation for securities offerings.
  - Restricting transfers based on geographic residency to comply with local laws.
  - Custom topics for specialized requirements, such as affiliation with a particular organization or completion of a lockup period.

Claim topics are not standalone; they rely on signed attestations (claims) stored in an investor's Identity contract, which implements the ERC-735 Claim Holder interface. These claims must be issued by entities listed in the Trusted Issuers Registry, ensuring trustworthiness and preventing unauthorized validations.

## Modular Compliance Architecture

ERC-3643 employs a modular design where claim topics integrate seamlessly with other components, such as the Identity Registry and Compliance Modules. This architecture separates concerns—identity verification from transfer rules—allowing for scalable and updatable compliance without redeploying the token contract.

Key improvements enabled by this modular approach:
- **Efficient Verification**: Identity checks (including claim topics) are performed on-chain, reducing reliance on off-chain processes and minimizing gas costs for routine operations.
- **Reusable Identities**: Investors can use a single on-chain identity across multiple ERC-3643 tokens, with claim topics tailored per token.
- **Dynamic Updates**: Compliance Modules can be bound or unbound to enforce global rules (e.g., maximum holders per country), while claim topics handle individual eligibility.
- **Enhanced Security**: By validating claims from trusted issuers only, the system mitigates risks like fraudulent identities or non-compliant transfers.

This structure supports advanced features, such as pausing tokens, freezing addresses, or recovering lost tokens, all while ensuring regulatory alignment. For deeper technical details, refer to the ERC-3643 specification and related standards like ERC-735 for claim management.