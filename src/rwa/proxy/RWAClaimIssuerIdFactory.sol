import {IdFactory} from "../../../lib/solidity/contracts/factory/IdFactory.sol";
import {Gateway} from "../../../lib/solidity/contracts/gateway/Gateway.sol";

contract RWAClaimIssuerIdFactory is IdFactory {
    constructor(address implementationAuthority) IdFactory(implementationAuthority) {}
}

contract RWAClaimIssuerGateway is Gateway {
    constructor(address idFactory, address[] memory signersToApprove) Gateway(idFactory, signersToApprove) {}
}
