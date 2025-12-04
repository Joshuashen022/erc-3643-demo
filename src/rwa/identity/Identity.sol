// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.17;

import {Identity} from "@onchain-id/solidity/contracts/Identity.sol";
import {ClaimIssuer} from "@onchain-id/solidity/contracts/ClaimIssuer.sol";

contract RWAIdentity is Identity {
    constructor(address initialManagementKey) Identity(initialManagementKey, false) {}
}

contract RWAClaimIssuer is ClaimIssuer {
    constructor(address initialManagementKey) ClaimIssuer(initialManagementKey) {}
}
