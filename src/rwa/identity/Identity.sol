// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.17;

import {IIdentity} from "@onchain-id/solidity/contracts/interface/IIdentity.sol";
import {IClaimIssuer} from "@onchain-id/solidity/contracts/interface/IClaimIssuer.sol";

/**
 * @dev Implementation of the IIdentity interface that stores real data.
 * This contract implements both IERC734 (Key Holder) and IERC735 (Claim Holder) standards.
 */
contract Identity is IIdentity {
    /**
     * @dev Structure for storing key information
     */
    struct Key {
        uint256[] purposes;
        uint256 keyType;
        bytes32 key;
    }

    /**
     * @dev Structure for storing execution requests
     */
    struct Execution {
        address to;
        uint256 value;
        bytes data;
        bool approved;
        bool executed;
    }

    /**
     * @dev Structure for storing claim information
     */
    struct Claim {
        uint256 topic;
        uint256 scheme;
        address issuer;
        bytes signature;
        bytes data;
        string uri;
    }

    // Storage mappings
    mapping(bytes32 => Key) private _keys;
    mapping(uint256 => bytes32[]) private _keysByPurpose;
    mapping(uint256 => Execution) private _executions;
    mapping(bytes32 => Claim) private _claims;
    mapping(uint256 => bytes32[]) private _claimsByTopic;

    // Execution nonce counter
    uint256 private _executionNonce;

    /**
     * @dev Constructor that initializes the identity with a management key
     * @param initialManagementKey The address of the initial management key
     */
    constructor(address initialManagementKey) {
        require(initialManagementKey != address(0), "Identity: zero address");
        
        bytes32 key = keccak256(abi.encode(initialManagementKey));
        _keys[key].key = key;
        _keys[key].purposes = [1]; // Purpose 1 = MANAGEMENT
        _keys[key].keyType = 1; // Type 1 = ECDSA
        _keysByPurpose[1].push(key);
        
        emit KeyAdded(key, 1, 1);
    }

    // ============ IERC734 (Key Holder) Functions ============

    /**
     * @dev Adds a key to the identity with a specific purpose
     * @param _key The public key (keccak256 hash of the address)
     * @param _purpose The purpose of the key (1 = MANAGEMENT, 2 = ACTION, 3 = CLAIM, 4 = ENCRYPTION)
     * @param _keyType The type of key (1 = ECDSA, 2 = RSA, etc.)
     * @return success Returns true if the key was added successfully
     */
    function addKey(bytes32 _key, uint256 _purpose, uint256 _keyType)
        external
        override
        returns (bool success)
    {
        require(
            msg.sender == address(this) || keyHasPurpose(keccak256(abi.encode(msg.sender)), 1),
            "Identity: only management key"
        );

        if (_keys[_key].key == _key) {
            // Key already exists, check if purpose already exists
            uint256[] memory purposes = _keys[_key].purposes;
            for (uint256 i = 0; i < purposes.length; i++) {
                require(purposes[i] != _purpose, "Identity: purpose already exists");
            }
            _keys[_key].purposes.push(_purpose);
        } else {
            // New key
            _keys[_key].key = _key;
            _keys[_key].purposes = [_purpose];
            _keys[_key].keyType = _keyType;
        }

        _keysByPurpose[_purpose].push(_key);
        emit KeyAdded(_key, _purpose, _keyType);

        return true;
    }

    /**
     * @dev Removes a purpose from a key
     * @param _key The public key
     * @param _purpose The purpose to remove
     * @return success Returns true if the purpose was removed successfully
     */
    function removeKey(bytes32 _key, uint256 _purpose)
        external
        override
        returns (bool success)
    {
        require(
            msg.sender == address(this) || keyHasPurpose(keccak256(abi.encode(msg.sender)), 1),
            "Identity: only management key"
        );
        require(_keys[_key].key == _key, "Identity: key does not exist");

        uint256[] memory purposes = _keys[_key].purposes;
        uint256 purposeIndex = purposes.length;
        
        // Find the purpose index
        for (uint256 i = 0; i < purposes.length; i++) {
            if (purposes[i] == _purpose) {
                purposeIndex = i;
                break;
            }
        }
        
        require(purposeIndex < purposes.length, "Identity: purpose does not exist");

        // Remove purpose from array
        if (purposes.length > 1) {
            _keys[_key].purposes[purposeIndex] = purposes[purposes.length - 1];
            _keys[_key].purposes.pop();
        } else {
            delete _keys[_key].purposes;
        }

        // Remove key from purpose mapping
        bytes32[] storage keysForPurpose = _keysByPurpose[_purpose];
        for (uint256 i = 0; i < keysForPurpose.length; i++) {
            if (keysForPurpose[i] == _key) {
                keysForPurpose[i] = keysForPurpose[keysForPurpose.length - 1];
                keysForPurpose.pop();
                break;
            }
        }

        uint256 keyType = _keys[_key].keyType;
        
        // If no purposes left, delete the key
        if (_keys[_key].purposes.length == 0) {
            delete _keys[_key];
        }

        emit KeyRemoved(_key, _purpose, keyType);
        return true;
    }

    /**
     * @dev Approves or rejects an execution request
     * @param _id The execution ID
     * @param _approve True to approve, false to reject
     * @return success Returns true if the approval was processed successfully
     */
    function approve(uint256 _id, bool _approve)
        external
        override
        returns (bool success)
    {
        require(_id < _executionNonce, "Identity: execution does not exist");
        require(!_executions[_id].executed, "Identity: execution already executed");

        // Check permissions
        if (_executions[_id].to == address(this)) {
            require(
                keyHasPurpose(keccak256(abi.encode(msg.sender)), 1),
                "Identity: only management key"
            );
        } else {
            require(
                keyHasPurpose(keccak256(abi.encode(msg.sender)), 2),
                "Identity: only action key"
            );
        }

        emit Approved(_id, _approve);

        if (_approve) {
            _executions[_id].approved = true;
            
            (success, ) = _executions[_id].to.call{value: _executions[_id].value}(
                _executions[_id].data
            );

            if (success) {
                _executions[_id].executed = true;
                emit Executed(
                    _id,
                    _executions[_id].to,
                    _executions[_id].value,
                    _executions[_id].data
                );
                return true;
            } else {
                emit ExecutionFailed(
                    _id,
                    _executions[_id].to,
                    _executions[_id].value,
                    _executions[_id].data
                );
                return false;
            }
        } else {
            _executions[_id].approved = false;
            return false;
        }
    }

    /**
     * @dev Executes a transaction (or creates an execution request)
     * @param _to The target address
     * @param _value The amount of ETH to send
     * @param _data The call data
     * @return executionId The execution ID
     */
    function execute(address _to, uint256 _value, bytes calldata _data)
        external
        payable
        override
        returns (uint256 executionId)
    {
        uint256 executionId_ = _executionNonce;
        _executionNonce++;

        _executions[executionId_].to = _to;
        _executions[executionId_].value = _value;
        _executions[executionId_].data = _data;
        _executions[executionId_].approved = false;
        _executions[executionId_].executed = false;

        emit ExecutionRequested(executionId_, _to, _value, _data);

        // Auto-approve if sender has management key or action key (for external calls)
        bytes32 senderKey = keccak256(abi.encode(msg.sender));
        bool canApprove = false;
        
        if (keyHasPurpose(senderKey, 1)) {
            // Management key can approve any execution
            canApprove = true;
        } else if (_to != address(this) && keyHasPurpose(senderKey, 2)) {
            // Action key can approve external calls only
            canApprove = true;
        }
        
        if (canApprove) {
            _executions[executionId_].approved = true;
            emit Approved(executionId_, true);
            
            (bool success, ) = _to.call{value: _value}(_data);
            
            if (success) {
                _executions[executionId_].executed = true;
                emit Executed(executionId_, _to, _value, _data);
            } else {
                emit ExecutionFailed(executionId_, _to, _value, _data);
            }
        }

        return executionId_;
    }

    /**
     * @dev Gets full key data
     * @param _key The public key
     * @return purposes Array of purposes
     * @return keyType The key type
     * @return key The key bytes32
     */
    function getKey(bytes32 _key)
        external
        view
        override
        returns (uint256[] memory purposes, uint256 keyType, bytes32 key)
    {
        return (_keys[_key].purposes, _keys[_key].keyType, _keys[_key].key);
    }

    /**
     * @dev Gets the purposes of a key
     * @param _key The public key
     * @return _purposes Array of purposes
     */
    function getKeyPurposes(bytes32 _key)
        external
        view
        override
        returns (uint256[] memory _purposes)
    {
        return _keys[_key].purposes;
    }

    /**
     * @dev Gets all keys with a specific purpose
     * @param _purpose The purpose to filter by
     * @return keys Array of keys with the specified purpose
     */
    function getKeysByPurpose(uint256 _purpose)
        external
        view
        override
        returns (bytes32[] memory keys)
    {
        return _keysByPurpose[_purpose];
    }

    /**
     * @dev Checks if a key has a specific purpose
     * @param _key The public key
     * @param _purpose The purpose to check
     * @return exists True if the key has the purpose
     */
    function keyHasPurpose(bytes32 _key, uint256 _purpose)
        public
        view
        override
        returns (bool exists)
    {
        if (_keys[_key].key == 0) {
            return false;
        }

        uint256[] memory purposes = _keys[_key].purposes;
        for (uint256 i = 0; i < purposes.length; i++) {
            // Management keys (purpose 1) can act as any purpose
            if (purposes[i] == 1 || purposes[i] == _purpose) {
                return true;
            }
        }

        return false;
    }

    // ============ IERC735 (Claim Holder) Functions ============

    /**
     * @dev Adds or updates a claim
     * @param _topic The claim topic
     * @param _scheme The verification scheme
     * @param issuer The issuer address
     * @param _signature The claim signature
     * @param _data The claim data
     * @param _uri The claim URI
     * @return claimRequestId The claim ID
     */
    function addClaim(
        uint256 _topic,
        uint256 _scheme,
        address issuer,
        bytes calldata _signature,
        bytes calldata _data,
        string calldata _uri
    )
        external
        override
        returns (bytes32 claimRequestId)
    {
        require(
            msg.sender == address(this) || keyHasPurpose(keccak256(abi.encode(msg.sender)), 3),
            "Identity: only claim key"
        );

        // Validate claim if issuer is not self
        if (issuer != address(this)) {
            require(
                IClaimIssuer(issuer).isClaimValid(IIdentity(address(this)), _topic, _signature, _data),
                "Identity: invalid claim"
            );
        }

        bytes32 claimId = keccak256(abi.encode(issuer, _topic));
        bool isNewClaim = _claims[claimId].issuer == address(0);

        _claims[claimId].topic = _topic;
        _claims[claimId].scheme = _scheme;
        _claims[claimId].issuer = issuer;
        _claims[claimId].signature = _signature;
        _claims[claimId].data = _data;
        _claims[claimId].uri = _uri;

        if (isNewClaim) {
            _claimsByTopic[_topic].push(claimId);
            emit ClaimAdded(claimId, _topic, _scheme, issuer, _signature, _data, _uri);
        } else {
            emit ClaimChanged(claimId, _topic, _scheme, issuer, _signature, _data, _uri);
        }

        return claimId;
    }

    /**
     * @dev Removes a claim
     * @param _claimId The claim ID
     * @return success Returns true if the claim was removed
     */
    function removeClaim(bytes32 _claimId)
        external
        override
        returns (bool success)
    {
        require(
            msg.sender == address(this) || keyHasPurpose(keccak256(abi.encode(msg.sender)), 3),
            "Identity: only claim key"
        );

        require(_claims[_claimId].issuer != address(0), "Identity: claim does not exist");

        uint256 topic = _claims[_claimId].topic;
        uint256 scheme = _claims[_claimId].scheme;
        address issuer = _claims[_claimId].issuer;
        bytes memory signature = _claims[_claimId].signature;
        bytes memory data = _claims[_claimId].data;
        string memory uri = _claims[_claimId].uri;

        // Remove from topic mapping
        bytes32[] storage claimsForTopic = _claimsByTopic[topic];
        for (uint256 i = 0; i < claimsForTopic.length; i++) {
            if (claimsForTopic[i] == _claimId) {
                claimsForTopic[i] = claimsForTopic[claimsForTopic.length - 1];
                claimsForTopic.pop();
                break;
            }
        }

        delete _claims[_claimId];

        emit ClaimRemoved(_claimId, topic, scheme, issuer, signature, data, uri);
        return true;
    }

    /**
     * @dev Gets a claim by ID
     * @param _claimId The claim ID
     * @return topic The claim topic
     * @return scheme The verification scheme
     * @return issuer The issuer address
     * @return signature The claim signature
     * @return data The claim data
     * @return uri The claim URI
     */
    function getClaim(bytes32 _claimId)
        external
        view
        override
        returns (
            uint256 topic,
            uint256 scheme,
            address issuer,
            bytes memory signature,
            bytes memory data,
            string memory uri
        )
    {
        return (
            _claims[_claimId].topic,
            _claims[_claimId].scheme,
            _claims[_claimId].issuer,
            _claims[_claimId].signature,
            _claims[_claimId].data,
            _claims[_claimId].uri
        );
    }

    /**
     * @dev Gets all claim IDs for a topic
     * @param _topic The claim topic
     * @return claimIds Array of claim IDs
     */
    function getClaimIdsByTopic(uint256 _topic)
        external
        view
        override
        returns (bytes32[] memory claimIds)
    {
        return _claimsByTopic[_topic];
    }

    // ============ IIdentity Functions ============

    /**
     * @dev Checks if a claim is valid
     * @param _identity The identity contract
     * @param claimTopic The claim topic
     * @param sig The signature
     * @param data The claim data
     * @return claimValid True if the claim is valid
     */
    function isClaimValid(
        IIdentity _identity,
        uint256 claimTopic,
        bytes calldata sig,
        bytes calldata data
    )
        external
        view
        override
        returns (bool claimValid)
    {
        bytes32 dataHash = keccak256(abi.encode(_identity, claimTopic, data));
        bytes32 prefixedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash)
        );

        address recovered = _recoverAddress(sig, prefixedHash);
        bytes32 hashedAddr = keccak256(abi.encode(recovered));

        // Check if the recovered address has claim signing purpose (purpose 3)
        return keyHasPurpose(hashedAddr, 3);
    }

    /**
     * @dev Internal function to recover address from signature
     * @param sig The signature
     * @param dataHash The data hash
     * @return addr The recovered address
     */
    function _recoverAddress(bytes memory sig, bytes32 dataHash)
        internal
        pure
        returns (address addr)
    {
        if (sig.length != 65) {
            return address(0);
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            return address(0);
        }

        return ecrecover(dataHash, v, r, s);
    }
}

