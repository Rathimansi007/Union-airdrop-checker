const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

async function queryGraphQL(query, vars) {
  const res = await fetch("https://graphql.union.build/v1/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: vars })
  });
  return res.json();
}

app.post("/api/check", async (req, res) => {
  const wallet = (req.body.wallet || "").toLowerCase();
  try {
    const scoreQ = `
      query($addr: String!) {
        v2_scores_by_pk(address: $addr) {
          address estimated_u volume_score diversity_score
          interaction_score holding_score cosmos_bonus union_user_bonus
        }
      }`;
    const scoreRes = await queryGraphQL(scoreQ, { addr: wallet });
    const score = scoreRes.data?.v2_scores_by_pk;

    const transferQ = `
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
    const transferRes = await queryGraphQL(transferQ, { addrs: [wallet] });
    const transfers = transferRes.data?.v2_transfers || [];

    // Token activity summary
    const activity = {};
    for (const t of transfers) {
      const sym = t.base_token_meta.representations[0].symbol;
      const dec = t.base_token_meta.representations[0].decimals;
      const amt = Number(t.base_amount) / (10 ** dec);
      activity[sym] = (activity[sym] || 0) + amt;
    }

    if (!score) {
      return res.json({
        success: false,
        error: "No $U data – wallet not found.",
        activity: Object.entries(activity).map(([symbol, amount]) => ({ symbol, amount }))
      });
    }

    res.json({
      success: true,
      scores: score,
      activity: Object.entries(activity).map(([symbol, amount]) => ({ symbol, amount }))
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "API error" });
  }
});

// Serve static index.html
app.use(express.static(__dirname));
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

app.use((_, res) => res.status(404).send("Route not found"));

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
