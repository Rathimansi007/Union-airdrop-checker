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
    // Get score data from Union
    const scoreQuery = `
      query {
        v2_scores_by_pk(address: "${wallet.toLowerCase()}") {
          estimatedU
          volumeScore
          diversityScore
          interactionScore
          holdingScore
          cosmosBonus
          unionUserBonus
        }
      }
    `;

    const scoreResponse = await fetch("https://graphql.union.build/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: scoreQuery })
    });

    const scoreJson = await scoreResponse.json();
    const scoreData = scoreJson.data?.v2_scores_by_pk;

    if (!scoreData) {
      return res.status(404).json({ success: false, error: "Wallet not found on Union." });
    }

    // Get token transfer data from Union
    const transferQuery = `
      query {
        v2_transfers(args: {
          p_limit: 50,
          p_addresses_canonical: ["${wallet.toLowerCase()}"]
        }) {
          base_amount
          base_token_meta {
            representations {
              symbol
              decimals
            }
          }
        }
      }
    `;

    const transferResponse = await fetch("https://graphql.union.build/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: transferQuery })
    });

    const transferJson = await transferResponse.json();
    const transfers = transferJson.data?.v2_transfers || [];

    const tokenTotals = {}; // symbol: { amount, usd (mocked $1 per unit) }

    transfers.forEach((tx) => {
      const symbol = tx.base_token_meta.representations[0].symbol || "UNKNOWN";
      const decimals = tx.base_token_meta.representations[0].decimals || 18;
      const realAmount = parseFloat(tx.base_amount) / Math.pow(10, decimals);

      if (!tokenTotals[symbol]) {
        tokenTotals[symbol] = { amount: 0, usd: 0 };
      }

      tokenTotals[symbol].amount += realAmount;
      tokenTotals[symbol].usd += realAmount * 1; // assume $1 per token
    });

    const activityArray = Object.keys(tokenTotals).map((symbol) => ({
      symbol,
      amount: tokenTotals[symbol].amount.toFixed(2),
      usd: tokenTotals[symbol].usd.toFixed(2)
    }));

    const estimatedVolumeUSD = activityArray.reduce((sum, token) => sum + parseFloat(token.usd), 0);

    res.json({
      success: true,
      wallet,
      estimatedU: scoreData.estimatedU,
      factors: {
        volumeScore: scoreData.volumeScore,
        diversityScore: scoreData.diversityScore,
        interactionScore: scoreData.interactionScore,
        holdingScore: scoreData.holdingScore,
        cosmosBonus: scoreData.cosmosBonus,
        unionUserBonus: scoreData.unionUserBonus
      },
      activityArray,
      estimatedVolumeUSD
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
