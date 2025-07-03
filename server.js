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
      query {
        v2_scores_by_pk(address: "${wallet.toLowerCase()}") {
          estimated_u
          volume_score
          diversity_score
          interaction_score
          holding_score
          cosmos_bonus
          union_user_bonus
        }
      }
    `;

    const response = await fetch("https://graphql.union.build/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    const json = await response.json();
    const data = json.data.v2_scores_by_pk;

    if (!data) {
      return res.status(404).json({ success: false, error: "Wallet not found on Union." });
    }

    res.json({
      success: true,
      wallet,
      estimatedU: data.estimated_u,
      factors: {
        volumeScore: data.volume_score,
        diversityScore: data.diversity_score,
        interactionScore: data.interaction_score,
        holdingScore: data.holding_score,
        cosmosBonus: data.cosmos_bonus,
        unionUserBonus: data.union_user_bonus
      },
      activityArray: [], // You can add Debank-based balances here later
      estimatedVolumeUSD: 0 // Placeholder
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
