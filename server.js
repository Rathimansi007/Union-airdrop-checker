// server.js
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/airdrop", async (req, res) => {
  const { wallet } = req.body;

  if (!wallet || !wallet.startsWith("0x") || wallet.length !== 42) {
    return res.status(400).json({ success: false, error: "Invalid wallet address." });
  }

  try {
    const unionQuery = `
      query {
        wallet(address: "${wallet}") {
          estimatedU
          factors {
            volumeScore
            diversityScore
            interactionScore
            holdingScore
            cosmosBonus
            unionUserBonus
          }
        }
      }
    `;

    const unionResponse = await fetch("https://graphql.union.build/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: unionQuery })
    });

    const unionJson = await unionResponse.json();
    const unionData = unionJson.data.wallet;

    if (!unionData) {
      return res.status(404).json({ success: false, error: "Wallet not found on Union." });
    }

    // Fetch token balances from Debank
    const debankResp = await fetch(`https://api.debank.com/token/balance_list?id=${wallet}`);
    const debankJson = await debankResp.json();

    const activityArray = debankJson.data
      .filter(token => token.price > 0 && token.amount > 0)
      .map(token => ({
        symbol: token.symbol,
        amount: token.amount / Math.pow(10, token.decimals),
        usd: ((token.amount / Math.pow(10, token.decimals)) * token.price).toFixed(2)
      }))
      .slice(0, 5); // Limit to top 5 tokens for simplicity

    const estimatedVolumeUSD = activityArray.reduce((acc, token) => acc + parseFloat(token.usd), 0).toFixed(2);

    res.json({
      success: true,
      wallet,
      estimatedU: unionData.estimatedU,
      factors: unionData.factors,
      activityArray,
      estimatedVolumeUSD
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
