const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

async function queryGraphQL(query, variables) {
  const response = await fetch("https://graphql.union.build/v1/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables })
  });
  return response.json();
}

app.post("/api/check", async (req, res) => {
  const wallet = (req.body.wallet || "").toLowerCase();
  try {
    const scoreQuery = `
      query($addr: String!) {
        v2_scores_by_pk(address: $addr) {
          address estimated_u volume_score diversity_score
          interaction_score holding_score cosmos_bonus union_user_bonus
        }
      }`;
    const scoreResult = await queryGraphQL(scoreQuery, { addr: wallet });
    const score = scoreResult.data?.v2_scores_by_pk;

    const transferQuery = `
      query($addrs: [String!]!) {
        v2_transfers(args: {
          p_addresses_canonical: $addrs,
          p_limit: 100
        }) {
          base_amount
          base_token_meta {
            representations { symbol decimals }
          }
        }
      }`;
    const transferResult = await queryGraphQL(transferQuery, { addrs: [wallet] });
    const transfers = transferResult.data?.v2_transfers || [];

    const activity = {};
    for (const t of transfers) {
      const sym = t.base_token_meta?.representations?.[0]?.symbol || "UNKNOWN";
      const dec = t.base_token_meta?.representations?.[0]?.decimals || 18;
      const amt = Number(t.base_amount) / (10 ** dec);
      activity[sym] = (activity[sym] || 0) + amt;
    }

    if (score) {
      res.json({
        success: true,
        scores: score,
        activity: Object.entries(activity).map(([symbol, amount]) => ({ symbol, amount }))
      });
    } else if (transfers.length > 0) {
      // Estimate based on token count or total volume
      const estimated = Math.floor(Object.values(activity).reduce((sum, amt) => sum + amt, 0) * 10) || 42;

      res.json({
        success: true,
        scores: {
          address: wallet,
          estimated_u: estimated,
          volume_score: "N/A",
          diversity_score: "N/A",
          interaction_score: "N/A",
          holding_score: "N/A",
          cosmos_bonus: "N/A",
          union_user_bonus: "N/A",
          fallback: true
        },
        activity: Object.entries(activity).map(([symbol, amount]) => ({ symbol, amount }))
      });
    } else {
      res.json({ success: false, error: "❌ Wallet has not interacted with Union." });
    }

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.get("/", (_, res) => res.sendFile(__dirname + "/index.html"));
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
