const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve index.html manually from root folder
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Serve static assets (like logo, CSS, etc.) from root
app.use(express.static(__dirname));

// Handle POST request to /airdrop
app.post("/airdrop", async (req, res) => {
  const { wallet } = req.body;

  if (!wallet || !wallet.startsWith("0x") || wallet.length !== 42) {
    return res.status(400).json({ success: false, error: "Invalid wallet address." });
  }

  try {
    const query = `
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

    const response = await fetch("https://graphql.union.build/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    const json = await response.json();
    const data = json.data.wallet;

    if (!data) {
      return res.status(404).json({ success: false, error: "Wallet not found on Union." });
    }

    // Optional: Debank/alternative token fetch logic can go here

    res.json({
      success: true,
      wallet,
      estimatedU: data.estimatedU,
      factors: data.factors,
      activityArray: [
        { symbol: "ETH", amount: 1.5, usd: 4500 },
        { symbol: "USDC", amount: 1200, usd: 1200 },
      ],
      estimatedVolumeUSD: 6789
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
