// Updated server.js
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serve index.html in root

app.post("/airdrop", async (req, res) => {
  const { wallet } = req.body;

  if (!wallet || !wallet.startsWith("0x") || wallet.length !== 42) {
    return res.status(400).json({ success: false, error: "Invalid wallet address." });
  }

  try {
    // 1. Union Airdrop Query
    const unionQuery = `
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

    const unionRes = await fetch("https://graphql.union.build/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: unionQuery }),
    });

    const unionJson = await unionRes.json();
    const unionData = unionJson?.data?.v2_scores_by_pk;

    if (!unionData) {
      return res.status(404).json({ success: false, error: "Wallet not found on Union." });
    }

    // 2. Get Token Balances from DeBank (EVM chains only)
    const debankRes = await fetch(`https://pro-openapi.debank.com/v1/user/token_list?id=${wallet}&is_all=true`, {
      headers: {
        accept: "application/json",
        // You need an API key from DeBank if rate-limiting applies:
        // 'AccessKey': 'your_api_key_here'
      }
    });

    const tokenList = await debankRes.json();

    // Filter top tokens (optional) and build activity array
    const activityArray = tokenList
      .filter(t => t.price > 0 && t.amount > 0)
      .map(t => ({
        symbol: t.symbol,
        amount: parseFloat(t.amount.toFixed(3)),
        usd: parseFloat((t.amount * t.price).toFixed(2))
      }))
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 5); // top 5 tokens

    const estimatedVolumeUSD = activityArray.reduce((sum, t) => sum + t.usd, 0);

    res.json({
      success: true,
      wallet,
      estimatedU: unionData.estimatedU,
      factors: {
        volumeScore: unionData.volumeScore,
        diversityScore: unionData.diversityScore,
        interactionScore: unionData.interactionScore,
        holdingScore: unionData.holdingScore,
        cosmosBonus: unionData.cosmosBonus,
        unionUserBonus: unionData.unionUserBonus
      },
      activityArray,
      estimatedVolumeUSD
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
