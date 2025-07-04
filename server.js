const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post("/api/check", async (req, res) => {
  const { wallet } = req.body;
  if (!wallet || !wallet.startsWith("0x")) {
    return res.status(400).json({ error: "Invalid address" });
  }

  // Fetch transfer data from Union
  const result = await fetch("https://graphql.union.build/v1/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query ($addr: String!) {
          v2_transfers(args: {
            p_limit: 100,
            p_addresses_canonical: [$addr]
          }) @cached(ttl: 30) {
            sender_canonical receiver_canonical
            base_amount
            base_token_meta {
              representations {
                symbol decimals
              }
            }
            source_universal_chain_id
          }
        }`,
      variables: { addr: wallet.toLowerCase() }
    })
  }).then(r => r.json());

  const transfers = result.data?.v2_transfers;
  if (!transfers) {
    return res.status(404).json({ error: "No activity found" });
  }

  // parse and build token activity
  const activityMap = {};
  let totalUsd = 0;
  const prices = { ETH: 3500, LINK: 15, USDC:1, XION:0.01, BTCN:65000 };

  transfers.forEach(tx => {
    const rep = tx.base_token_meta.representations[0];
    const amount = parseFloat(tx.base_amount) / (10 ** rep.decimals);
    activityMap[rep.symbol] = (activityMap[rep.symbol] || 0) + amount;
  });

  const activity = Object.entries(activityMap).map(([sym, amt]) => {
    const usd = amt * (prices[sym] || 0);
    totalUsd += usd;
    return { symbol: sym, amount: amt.toFixed(4), usd: usd.toFixed(2) };
  });

  // score calc (example factors)
  const volumeScore = Math.min(100, totalUsd);
  const diversityScore = Object.keys(activityMap).length * 10;
  const interactionScore = 30;
  const holdingScore = totalUsd > 1000 ? 20 : 0;
  const cosmosBonus = transfers.some(tx => tx.source_universal_chain_id.includes("cosmos")) ? 20 : 0;
  const unionBonus = 30;

  const totalScore = volumeScore + diversityScore + interactionScore + holdingScore + cosmosBonus + unionBonus;
  const estimatedU = totalScore * 1; // 1 U per score, adjust as needed

  res.json({
    success: true,
    wallet,
    activityArray: activity,
    estimatedVolumeUSD: totalUsd.toFixed(2),
    estimatedU: estimatedU.toFixed(2),
    factors: {
      volumeScore,
      diversityScore,
      interactionScore,
      holdingScore,
      cosmosBonus,
      unionUserBonus: unionBonus
    }
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use((req,res)=>{
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
