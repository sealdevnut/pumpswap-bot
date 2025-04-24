import { 
    PublicKey, 
    Keypair, 
    Connection,
    ParsedTransactionWithMeta,
    ConfirmedSignatureInfo
} from '@solana/web3.js';
import { PumpSwapSDK } from './pumpswap';
import { logger } from './utils';
import { connection, wallet_1 } from './constants';
import { getPrice } from './pool';

interface SniperConfig {
    // Token configuration
    tokenMint: string;              // Token to snipe
    buyAmount: number;              // Amount of SOL to buy with
    sellPercentage: number;         // Percentage to sell at (0-100)
    maxSlippage: number;           // Maximum allowed slippage (%)

    // Timing configuration
    buyDelayMs: number;            // Delay before buying (ms)
    sellDelayMs: number;           // Delay before selling (ms)
    
    // Price monitoring
    minPriceImpact: number;        // Minimum price impact to trigger buy
    maxPriceImpact: number;        // Maximum price impact to trigger buy
    
    // Safety
    maxConcurrentTrades: number;   // Maximum concurrent trades
    stopLossPercentage: number;    // Stop loss percentage
    takeProfitPercentage: number;  // Take profit percentage
}

export class PumpSwapSniper {
    private config: SniperConfig;
    private sdk: PumpSwapSDK;
    private isRunning: boolean = false;
    private activeTrades: number = 0;
    private lastSignature: string | null = null;

    constructor(config: SniperConfig) {
        this.config = config;
        this.sdk = new PumpSwapSDK();
    }

    /**
     * Start the sniper bot
     */
    public async start() {
        if (this.isRunning) {
            throw new Error('Sniper bot is already running');
        }

        this.isRunning = true;
        logger.info('Starting PumpSwap Sniper Bot...');
        
        // Get initial signature
        const signatures = await connection.getSignaturesForAddress(
            new PublicKey(this.config.tokenMint),
            { limit: 1 }
        );
        
        if (signatures.length > 0) {
            this.lastSignature = signatures[0].signature;
        }

        // Start monitoring loop
        this.monitorLoop();
    }

    /**
     * Stop the sniper bot
     */
    public stop() {
        this.isRunning = false;
        logger.info('Stopping PumpSwap Sniper Bot...');
    }

    /**
     * Main monitoring loop
     */
    private async monitorLoop() {
        while (this.isRunning) {
            try {
                await this.checkNewTransactions();
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
            } catch (error) {
                logger.error('Error in monitoring loop:', error);
                await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay on error
            }
        }
    }

    /**
     * Check for new transactions
     */
    private async checkNewTransactions() {
        const signatures = await connection.getSignaturesForAddress(
            new PublicKey(this.config.tokenMint),
            { until: this.lastSignature }
        );

        if (signatures.length === 0) return;

        // Process new transactions
        for (const sig of signatures.reverse()) {
            await this.processTransaction(sig);
        }

        // Update last signature
        this.lastSignature = signatures[0].signature;
    }

    /**
     * Process a single transaction
     */
    private async processTransaction(sig: ConfirmedSignatureInfo) {
        try {
            const tx = await connection.getParsedTransaction(sig.signature);
            if (!tx) return;

            // Check if transaction is relevant
            if (!this.isRelevantTransaction(tx)) return;

            // Check if we can execute new trades
            if (this.activeTrades >= this.config.maxConcurrentTrades) {
                logger.warn('Maximum concurrent trades reached');
                return;
            }

            // Execute trade
            await this.executeTrade(tx);
        } catch (error) {
            logger.error('Error processing transaction:', error);
        }
    }

    /**
     * Check if transaction is relevant for sniping
     */
    private isRelevantTransaction(tx: ParsedTransactionWithMeta): boolean {
        // Add your transaction filtering logic here
        // For example, check for specific program calls or account interactions
        return true;
    }

    /**
     * Execute a trade
     */
    private async executeTrade(tx: ParsedTransactionWithMeta) {
        try {
            this.activeTrades++;
            logger.info('Starting new trade execution');

            // Wait for configured buy delay
            await new Promise(resolve => setTimeout(resolve, this.config.buyDelayMs));

            // Execute buy
            await this.sdk.buy(
                new PublicKey(this.config.tokenMint),
                wallet_1.publicKey,
                this.config.buyAmount
            );

            logger.info(`Bought ${this.config.buyAmount} SOL worth of tokens`);

            // Wait for configured sell delay
            await new Promise(resolve => setTimeout(resolve, this.config.sellDelayMs));

            // Execute sell
            await this.sdk.sell_percentage(
                new PublicKey(this.config.tokenMint),
                wallet_1.publicKey,
                this.config.sellPercentage
            );

            logger.info(`Sold ${this.config.sellPercentage}% of tokens`);

            // Monitor for stop loss or take profit
            await this.monitorPosition();
        } catch (error) {
            logger.error('Error executing trade:', error);
        } finally {
            this.activeTrades--;
        }
    }

    /**
     * Monitor position for stop loss or take profit
     */
    private async monitorPosition() {
        const initialPrice = await getPrice(new PublicKey(this.config.tokenMint));
        
        while (true) {
            const currentPrice = await getPrice(new PublicKey(this.config.tokenMint));
            const priceChange = ((currentPrice - initialPrice) / initialPrice) * 100;

            // Check stop loss
            if (priceChange <= -this.config.stopLossPercentage) {
                await this.sdk.sell_percentage(
                    new PublicKey(this.config.tokenMint),
                    wallet_1.publicKey,
                    100 // Sell all
                );
                logger.info('Stop loss triggered');
                break;
            }

            // Check take profit
            if (priceChange >= this.config.takeProfitPercentage) {
                await this.sdk.sell_percentage(
                    new PublicKey(this.config.tokenMint),
                    wallet_1.publicKey,
                    100 // Sell all
                );
                logger.info('Take profit triggered');
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
    }
}

// Example usage
async function main() {
    const config: SniperConfig = {
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