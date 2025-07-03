// server.js
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post("/airdrop", async (req, res) => {
  const { wallet } = req.body;

  if (!wallet || !wallet.startsWith("0x") || wallet.length !== 42) {
    return res.status(400).json({ success: false, error: "Invalid wallet address." });
  }

  try {
    const query = `
      query GetTransfers {
        v2_transfers(args: {
          p_addresses_canonical: ["${wallet}"],
          p_limit: 100
        }) {
          base_amount
          base_token_meta {
            representations {
              name
              symbol
              decimals
            }
          }
        }
      }
    `;

    const response = await fetch("https://graphql.union.build/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    const json = await response.json();
    const transfers = json.data?.v2_transfers || [];

    if (!transfers.length) {
      return res.status(404).json({ success: false, error: "No Union transfers found for this wallet." });
    }

    // Group by token symbol
    const tokenMap = {};
    for (const tx of transfers) {
      const symbol = tx.base_token_meta.representations[0]?.symbol || "UNKNOWN";
      const decimals = tx.base_token_meta.representations[0]?.decimals || 18;
      const normalizedAmount = Number(tx.base_amount) / (10 ** decimals);
      if (!tokenMap[symbol]) {
        tokenMap[symbol] = { symbol, amount: 0 };
      }
      tokenMap[symbol].amount += normalizedAmount;
    }

    const activityArray = Object.values(tokenMap).map(token => ({
      symbol: token.symbol,
      amount: Number(token.amount.toFixed(3)),
      usd: Number((token.amount * 1).toFixed(2)) // Placeholder $1 each
    }));

    const estimatedVolumeUSD = activityArray.reduce((sum, t) => sum + t.usd, 0);

    const factors = {
      volumeScore: Math.min(100, Math.round(estimatedVolumeUSD / 100)),
      diversityScore: Math.min(100, activityArray.length * 10),
      interactionScore: Math.min(100, transfers.length),
      holdingScore: 10,
      cosmosBonus: 0,
      unionUserBonus: 0
    };

    const estimatedU = Object.values(factors).reduce((sum, v) => sum + v, 0);

    res.json({
      success: true,
      wallet,
      activityArray,
      estimatedVolumeUSD,
      factors,
      estimatedU
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
