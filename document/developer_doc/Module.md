# Modules in ERC-3643

## Introduction

ERC-3643, also known as T-REX (Token for Regulated EXchanges), is an Ethereum standard designed for permissioned tokens that represent real-world assets (RWAs) with built-in compliance mechanisms. It extends the ERC-20 token standard by incorporating regulatory controls, identity verification, and modular extensibility to ensure tokens adhere to legal and institutional requirements.

A key innovation in ERC-3643 is its modular compliance system, which allows issuers to attach customizable modules to enforce specific rules during token operations like transfers, minting, and burning. This modularity provides flexibility for adapting to diverse regulatory environments without redeploying the core token contract.

Similar to hooks in other protocols, modules in ERC-3643 enable developers to intercept and validate token actions, promoting "compliance by design." This document explores the concept of modules, their implementation, and practical applications.

## Modules

Modules are external smart contracts that integrate with the ERC-3643 compliance framework to apply custom logic. They are not standalone entities but are plugged into a **ModularCompliance** contract, which acts as a central hub for rule enforcement.

- **Definition**: A module is a pluggable component that implements compliance checks or actions. It allows for dynamic rule sets, such as investor limits, geographic restrictions, or holding caps, to be added or removed post-deployment.
- **Purpose**: Modules ensure that token operations comply with regulations (e.g., KYC/AML requirements) while maintaining the token's fungibility and efficiency. They enable institutions to issue and manage regulated assets on-chain without compromising security or liquidity.
- **Key Features**:
  - **Modularity**: Modules can be added, removed, or upgraded by token agents or owners.
  - **Interoperability**: Works seamlessly with ERC-3643's identity registry and trusted issuers system for user verification.
  - **Event-Driven**: Modules respond to token lifecycle events like transfers and issuances.

Each ERC-3643 token is associated with a single compliance contract, which can host multiple modules. This setup allows for a "Lego-like" architecture where compliance logic is composed from reusable building blocks.

## How Modules Work

In ERC-3643, the compliance process is orchestrated through the **ICompliance** interface, which the token contract calls during operations. For modular setups, the **ModularCompliance** contract delegates checks to attached modules.

### Attachment and Configuration
- **Binding**: The compliance contract is bound to the token via `bindToken(address _token)`. Only the token owner or agent can perform this.
- **Adding Modules**: Use `addModule(address _module)` on the ModularCompliance contract. Modules must be deployed separately and support the required callbacks.
- **Removal**: Modules can be detached with `deleteModule(address _module)`, allowing runtime adaptability (e.g., to comply with changing laws).

### Execution Flow
During a token operation (e.g., transfer):
1. The token contract queries the bound compliance contract's `canTransfer(address _from, address _to, uint256 _amount)` to check if the action is allowed.
2. The ModularCompliance iterates over attached modules, calling each one's equivalent function.
3. If all modules approve (return `true`), the operation proceeds.
4. Post-operation, the compliance contract notifies modules via hooks like `transferred(address _from, address _to, uint256 _amount)` to update internal state.

This pre- and post-hook mechanism ensures atomic compliance without reverting valid transactions unnecessarily.

### Dependencies
Modules often interact with:
- **Identity Registry**: Verifies user identities using ONCHAINID (ERC-734/735 compliant).
- **Trusted Issuers Registry**: Ensures claims (e.g., accreditation status) are from authorized sources.
- **Claim Topics**: Modules can enforce rules based on specific claim types (e.g., only allow transfers to holders with a "verified investor" claim).
