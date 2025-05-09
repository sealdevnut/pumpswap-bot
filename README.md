# PumpSwap Sniper bot

A TypeScript SDK for interacting with PumpSwap DEX, featuring a sniper bot and transaction bundler with MEV protection.

## Features

### Core SDK
- 🔄 Buy and sell tokens
- 💰 Price fetching
- 📊 Pool information
- ⚡ Fast transaction execution

### Sniper Bot
- 🔍 Real-time transaction monitoring
- ⚡ Fast buy/sell execution
- 🎯 Configurable entry/exit points
- 💰 Stop loss and take profit
- ⚖️ Price impact monitoring
- 🔒 Slippage protection
- 📊 Concurrent trade management

### Transaction Bundler
- 📦 Transaction bundling with configurable limits
- ⚡ Automatic compute budget instructions
- 🔒 MEV protection through Jito bundles
- 📊 Transaction size management
- 🧹 Bundle clearing and reset functionality

## Prerequisites

- Node.js v16 or higher
- npm or yarn
- Solana wallet with SOL for transactions
- Helius RPC key
- Jito bundle access (for bundler)

## Usage

### Basic Trading

```typescript
import { wallet_1 } from "./constants";
import { PumpSwapSDK } from './pumpswap';

async function main() {
    const mint = "your-pumpfun-token-address";
    const sol_amt = 0.99; // buy 1 SOL worth of token using WSOL
    const sell_percentage = 0.5; // sell 50% of the token
    
    const pumpswap_sdk = new PumpSwapSDK();
    
    // Buy tokens
    await pumpswap_sdk.buy(new PublicKey(mint), wallet_1.publicKey, sol_amt);
    
    // Sell percentage of tokens
    await pumpswap_sdk.sell_percentage(new PublicKey(mint), wallet_1.publicKey, sell_percentage);
    
    // Sell exact amount of tokens
    await pumpswap_sdk.sell_exactAmount(new PublicKey(mint), wallet_1.publicKey, 1000);
}
```

### Price and Pool Information

```typescript
import { getPrice, getPumpSwapPool } from './pool';

async function main() {
    const mint = new PublicKey("your-pumpfun-token-address");
    
    // Get token price
    console.log(await getPrice(mint));
    
    // Get pool information
    console.log(await getPumpSwapPool(mint));
}
```

### Sniper Bot

```typescript
import { PumpSwapSniper } from './src/sniper-bot';

async function main() {
    const config = {
        tokenMint: "YOUR_TOKEN_MINT_ADDRESS",
        buyAmount: 0.1,              // 0.1 SOL
        sellPercentage: 50,          // Sell 50%
        maxSlippage: 5,              // 5% max slippage
        buyDelayMs: 1000,            // 1 second delay
        sellDelayMs: 5000,           // 5 second delay
        minPriceImpact: 1,           // 1% minimum price impact
        maxPriceImpact: 10,          // 10% maximum price impact
        maxConcurrentTrades: 3,      // Maximum 3 concurrent trades
        stopLossPercentage: 10,      // 10% stop loss
        takeProfitPercentage: 20     // 20% take profit
    };

    const sniper = new PumpSwapSniper(config);
    await sniper.start();
}
```

### Transaction Bundler

```typescript
import { PumpSwapBundler } from './src/bundler';
import { PumpSwapSDK } from './src/pumpswap';

async function main() {
    // Initialize bundler
    const bundler = new PumpSwapBundler({
        maxTransactions: 4,
        tipAmount: 0.0001,
        computeUnits: 300000,
        computeUnitPrice: 696969
    });

    // Initialize PumpSwap SDK
    const sdk = new PumpSwapSDK();

    // Create and add transactions
    const buyTx = await sdk.createBuyTransaction(/* params */);
    bundler.addTransaction(buyTx);

    const sellTx = await sdk.createSellTransaction(/* params */);
    bundler.addTransaction(sellTx);

    // Send bundle
    const uuid = await bundler.sendBundle(poolId, signer);
    console.log('Bundle sent:', uuid);
}
```

## Configuration

### Sniper Bot Configuration
```typescript
interface SniperConfig {
    tokenMint: string;              // Token to snipe
    buyAmount: number;              // Amount of SOL to buy with
    sellPercentage: number;         // Percentage to sell at (0-100)
    maxSlippage: number;           // Maximum allowed slippage (%)
    buyDelayMs: number;            // Delay before buying (ms)
    sellDelayMs: number;           // Delay before selling (ms)
    minPriceImpact: number;        // Minimum price impact to trigger buy
    maxPriceImpact: number;        // Maximum price impact to trigger buy
    maxConcurrentTrades: number;   // Maximum concurrent trades
    stopLossPercentage: number;    // Stop loss percentage
    takeProfitPercentage: number;  // Take profit percentage
}
```

### Bundler Configuration
```typescript
interface BundleConfig {
    maxTransactions: number;    // Maximum transactions per bundle
    tipAmount: number;         // Amount to tip validators
    computeUnits: number;      // Compute units for transactions
    computeUnitPrice: number;  // Price per compute unit
}
```

## Safety Features

- Transaction monitoring and validation
- Price impact checks
- Slippage protection
- Stop loss mechanisms
- Concurrent trade limiting
- Error handling and recovery
- MEV protection through Jito bundles

## Important Notes

1. Make sure you have enough SOL for:
   - Transaction fees
   - Compute budget
   - Validator tips
2. Monitor transaction sizes and limits
3. Consider network congestion when setting parameters
4. Use appropriate compute units for your transactions
5. Always test with small amounts first

## Support

[Twitter](https://x.com/0xmooncity)


