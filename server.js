const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ Serve static files from root (not "public")
app.use(express.static(__dirname));

// ✅ Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ Airdrop checker API route
app.post("/airdrop", async (req, res) => {
  const { wallet } = req.body;

  if (!wallet || !wallet.startsWith("0x")) {
    return res.status(400).json({ success: false, error: "Invalid wallet address" });
  }

  // Simulated response
  const fakeData = {
    success: true,
    wallet,
    estimatedU: 1234,
    estimatedVolumeUSD: 6789,
    activityArray: [
      { symbol: "ETH", amount: 1.5, usd: 4500 },
      { symbol: "USDC", amount: 1200, usd: 1200 },
    ],
    factors: {
      volumeScore: 80,
      diversityScore: 70,
      interactionScore: 65,
      holdingScore: 75,
      cosmosBonus: 20,
      unionUserBonus: 30,
    },
  };

  res.json(fakeData);
});

app.listen(PORT, () => {
  console.log(`✅ Server is live at http://localhost:${PORT}`);
});
