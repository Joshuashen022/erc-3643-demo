# Oracle

## Hash
```mermaid
flowchart LR

    subgraph DS["Data Source"]
        RAW
        Hash
        RAW --> Hash
    end
    subgraph EA["External Adapter"]
        Adapter
    end
    subgraph ON["Oracle Node"]
        Node
    end
    subgraph CC["Consumer Contract"]
        Contract
    end
    Hash --> EA --> ON -->CC
```


## Chainlink DECO (Optional)
```mermaid
flowchart LR
    subgraph DS["Data Source"]
        RAW
    end

    subgraph EA["External Adapter"]
        Adapter
    end

    subgraph ON["Oracle Node"]
        DECO["DECO Oracle"]
        PROOF["ZK Proof"]
        DECO --> PROOF
    end

    subgraph CC["Consumer Contract"]
        Contract
    end

    RAW --> |Safe Channel|Adapter 
    Adapter --> |TLS|DECO 
    PROOF --> CC
```

## Chainlink Functions (Optional)

```mermaid
flowchart LR

    subgraph DS["Data Source"]
        RAW
    end
    subgraph EA["External Adapter"]
        Adapter
        CustomCode
    end
    subgraph ON["Oracle Node"]
        DON
        PROOF["Custom Proof"]
        DON --> PROOF
        CustomCode --> PROOF
    end
    subgraph CC["Consumer Contract"]
        Contract
    end
    RAW --> |Safe Channel|Adapter 
    Adapter --> |Safe Channel + MPC|DON 
    PROOF --> CC
```

# USDC

Value on Aggregator is almost same to chainlink page

## Aggregator
Address: https://etherscan.io/address/0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6#readContract

### latestRound

get the latest completed round where the answer was updated

55340232221128655514 uint256


### Oracle
https://data.chain.link/feeds/ethereum/mainnet/usdc-usd#operator-snzpool

