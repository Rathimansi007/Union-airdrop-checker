const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // serve frontend files

app.post("/airdrop", (req, res) => {
  const wallet = req.body.wallet;
  if (!wallet || !wallet.startsWith("0x")) {
    return res.json({ success: false, error: "Invalid wallet address" });
  }

  // Here is your logic; for now, dummy data:
  res.json({
    success: true,
    wallet,
    estimatedU: 215.15,
    estimatedVolumeUSD: 130107.96,
    activityArray: [
      { symbol: "ETH", amount: "0.0200", usd: "70.00" },
      { symbol: "LINK", amount: "2.5232", usd: "37.85" },
      { symbol: "USDC", amount: "0.1000", usd: "0.10" },
      { symbol: "XION", amount: "1.0000", usd: "0.01" },
      { symbol: "uniBTCd", amount: "2.0000", usd: "130000.00" }
    ],
    factors: {
      volumeScore: 100,
      diversityScore: 50,
      interactionScore: 30,
      holdingScore: 0,
      cosmosBonus: 20,
      unionUserBonus: 30
    }
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
