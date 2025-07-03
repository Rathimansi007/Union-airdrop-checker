// server.js (Render backend)
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post("/check-airdrop", async (req, res) => {
  const { wallet } = req.body;
  if (!wallet || typeof wallet !== "string" || !wallet.startsWith("0x")) {
    return res.json({ success: false, error: "Invalid wallet address." });
  }

  const query = `
    query GetAirdrop($address: String!) {
      v2_scores_by_pk(address: $address) {
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

  const variables = { address: wallet.toLowerCase() };

  try {
    const response = await fetch("https://graphql.union.build/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables })
    });

    const json = await response.json();
    const result = json.data?.v2_scores_by_pk;

    if (!result) {
      return res.json({ success: false, error: "Wallet not found on Union." });
    }

    res.json({
      success: true,
      data: {
        estimatedU: result.estimated_u,
        volumeScore: result.volume_score,
        diversityScore: result.diversity_score,
        interactionScore: result.interaction_score,
        holdingScore: result.holding_score,
        cosmosBonus: result.cosmos_bonus,
        unionUserBonus: result.union_user_bonus
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
