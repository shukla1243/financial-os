const EVM_CHAINS = [
  {
    name: 'Ethereum',
    rpc: 'https://cloudflare-eth.com',
    explorer: 'https://eth.blockscout.com/api/v2',
    nativeSymbol: 'ETH',
    coingeckoId: 'ethereum'
  },
  {
    name: 'BSC',
    rpc: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bsc.blockscout.com/api/v2',
    nativeSymbol: 'BNB',
    coingeckoId: 'binancecoin'
  },
  {
    name: 'Polygon',
    rpc: 'https://polygon-rpc.com',
    explorer: 'https://polygon.blockscout.com/api/v2',
    nativeSymbol: 'MATIC',
    coingeckoId: 'matic-network'
  },
  {
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbitrum.blockscout.com/api/v2',
    nativeSymbol: 'ETH',
    coingeckoId: 'ethereum'
  },
  {
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimism.blockscout.com/api/v2',
    nativeSymbol: 'ETH',
    coingeckoId: 'ethereum'
  },
  {
    name: 'Base',
    rpc: 'https://mainnet.base.org',
    explorer: 'https://base.blockscout.com/api/v2',
    nativeSymbol: 'ETH',
    coingeckoId: 'ethereum'
  }
];

export const COINGECKO_MAPPING = {
  'btc': 'bitcoin',
  'eth': 'ethereum',
  'sol': 'solana',
  'ada': 'cardano',
  'bnb': 'binancecoin',
  'matic': 'matic-network',
  'pol': 'matic-network',
  'usdt': 'tether',
  'usdc': 'usd-coin',
  'dai': 'dai',
  'wbtc': 'wrapped-bitcoin',
  'link': 'chainlink',
  'uni': 'uniswap',
  'op': 'optimism',
  'arb': 'arbitrum',
  'doge': 'dogecoin',
  'shib': 'shiba-inu',
  'pepe': 'pepe',
  'trx': 'tron',
  'avax': 'avalanche-2',
  'dot': 'polkadot',
  'near': 'near'
};

// Fetch native balance of EVM address on a specific RPC
export const fetchEvmNativeBalance = async (address, rpcUrl) => {
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1
      })
    });
    const json = await res.json();
    if (json && json.result) {
      return parseInt(json.result, 16) / 1e18;
    }
  } catch (e) {
    console.warn(`Failed to fetch EVM native balance from ${rpcUrl}:`, e);
  }
  return 0;
};

// Fetch ERC-20 token balances from Blockscout
const fetchBlockscoutTokens = async (explorerUrl, address) => {
  try {
    const res = await fetch(`${explorerUrl}/addresses/${address}/token-balances`);
    if (!res.ok) return [];
    const tokens = await res.json();
    if (!Array.isArray(tokens)) return [];
    return tokens
      .filter(t => t.token && t.token.type === 'ERC-20' && t.value && t.token.symbol)
      .map(t => {
        const decimals = parseInt(t.token.decimals || '18', 10);
        const balance = parseFloat(t.value) / Math.pow(10, decimals);
        return {
          symbol: t.token.symbol.toUpperCase(),
          name: t.token.name || t.token.symbol,
          balance
        };
      })
      .filter(t => t.balance > 0.0001); // Filter out tiny dust
  } catch (e) {
    console.warn(`Blockscout fetch failed for ${explorerUrl}:`, e);
    return [];
  }
};

// Fetch single-asset wallet balance
export const fetchSingleWalletBalance = async (address, coinId) => {
  try {
    const asset = coinId.toLowerCase();
    if (asset === 'ethereum' || asset === 'eth') {
      return await fetchEvmNativeBalance(address, 'https://cloudflare-eth.com');
    } else if (asset === 'solana' || asset === 'sol') {
      const res = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getBalance',
          params: [address],
          id: 1
        })
      });
      const json = await res.json();
      if (json && json.result) {
        return json.result.value / 1e9;
      }
    } else if (asset === 'bitcoin' || asset === 'btc') {
      const res = await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`);
      const json = await res.json();
      if (json && json.balance !== undefined) {
        return json.balance / 1e8;
      }
    }
  } catch (e) {
    console.error('Failed to fetch single wallet balance:', address, coinId, e);
  }
  return 0;
};

// Resolve full multi-chain EVM wallet portfolio
export const resolveEvmWallet = async (address) => {
  const portfolio = [];
  try {
    // 1. Fetch native assets and ERC20 tokens across all EVM chains in parallel
    const chainResults = await Promise.all(
      EVM_CHAINS.map(async (chain) => {
        const nativeBal = await fetchEvmNativeBalance(address, chain.rpc);
        const tokens = await fetchBlockscoutTokens(chain.explorer, address);
        return { chain, nativeBal, tokens };
      })
    );

    // 2. Consolidate native and token holdings
    const holdings = {}; // key: Symbol, value: { balance, name, chains: [] }

    chainResults.forEach(({ chain, nativeBal, tokens }) => {
      // Add native balance
      if (nativeBal > 0.0001) {
        if (!holdings[chain.nativeSymbol]) {
          holdings[chain.nativeSymbol] = {
            symbol: chain.nativeSymbol,
            name: chain.nativeSymbol === 'ETH' ? 'Ethereum' : chain.name,
            balance: 0,
            chains: []
          };
        }
        holdings[chain.nativeSymbol].balance += nativeBal;
        holdings[chain.nativeSymbol].chains.push(`${chain.name} (Native)`);
      }

      // Add ERC-20 tokens
      tokens.forEach(t => {
        if (!holdings[t.symbol]) {
          holdings[t.symbol] = {
            symbol: t.symbol,
            name: t.name,
            balance: 0,
            chains: []
          };
        }
        holdings[t.symbol].balance += t.balance;
        holdings[t.symbol].chains.push(chain.name);
      });
    });

    return Object.values(holdings);
  } catch (e) {
    console.error('Error resolving EVM wallet portfolio:', address, e);
  }
  return portfolio;
};

// Resolve all investment entries (expanding wallets)
export const resolveAllInvestments = async (items) => {
  if (!Array.isArray(items)) return [];

  const resolved = [];
  for (const item of items) {
    if (item.Type === 'Crypto' && item.Platform?.startsWith('Wallet:')) {
      const addr = item.Platform.replace('Wallet:', '').trim();
      const asset = (item.Fund_Coin || '').toLowerCase();

      if (asset === 'evm-wallet' || asset === 'evm') {
        const evmHoldings = await resolveEvmWallet(addr);
        if (evmHoldings.length > 0) {
          evmHoldings.forEach(token => {
            resolved.push({
              ...item,
              Fund_Coin: token.symbol,
              fund_coin: token.symbol,
              Units: token.balance,
              units: token.balance,
              Platform: `Wallet:${addr} (${token.chains.join(', ')})`,
              platform: `Wallet:${addr} (${token.chains.join(', ')})`,
              BuyPrice: 0,
              buyPrice: 0,
              CurrentValue: 0,
              currentValue: 0,
              Type: 'Crypto',
              type: 'Crypto'
            });
          });
        } else {
          // Keep the placeholder with 0 balance if empty
          resolved.push({
            ...item,
            Units: 0,
            units: 0,
            BuyPrice: 0,
            buyPrice: 0,
            CurrentValue: 0,
            currentValue: 0,
            Type: 'Crypto',
            type: 'Crypto'
          });
        }
      } else {
        const bal = await fetchSingleWalletBalance(addr, asset);
        resolved.push({
          ...item,
          Units: bal || 0,
          units: bal || 0,
          BuyPrice: 0,
          buyPrice: 0,
          CurrentValue: 0,
          currentValue: 0,
          Type: 'Crypto',
          type: 'Crypto'
        });
      }
    } else {
      resolved.push(item);
    }
  }
  return resolved;
};

// Fetch prices dynamically for given CoinGecko IDs
export const fetchCoinGeckoPrices = async (ids = []) => {
  const defaultIds = ['bitcoin', 'ethereum', 'solana', 'cardano', 'binancecoin', 'matic-network', 'tether', 'usd-coin'];
  const allIds = Array.from(new Set([...defaultIds, ...ids])).filter(Boolean).join(',');
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${allIds}&vs_currencies=inr`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('CoinGecko fetch failed:', e);
  }
  return null;
};
