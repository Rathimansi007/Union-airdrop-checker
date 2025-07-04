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
    let score = scoreRes.data?.v2_scores_by_pk;

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

    // Calculate mock $U if score is null but transfers exist
    if (!score && transfers.length > 0) {
      let totalVolume = 0;
      const activity = {};

      for (const t of transfers) {
        const r = t.base_token_meta.representations[0];
        const amt = Number(t.base_amount) / (10 ** r.decimals);
        const sym = r.symbol;
        activity[sym] = (activity[sym] || 0) + amt;
        totalVolume += amt;
      }

      // Assign mock scores
      score = {
        address: wallet,
        estimated_u: Math.max(50, Math.round(totalVolume * 100)),
        volume_score: 1,
        diversity_score: 1,
        interaction_score: 1,
        holding_score: 1,
        cosmos_bonus: 0,
        union_user_bonus: 0
      };
    }

    if (!score) {
      return res.json({ success: false, error: "❌ This wallet has not interacted with Union." });
    }

    res.json({ success: true, scores: score });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "API error" });
  }
});

app.use(express.static(__dirname));
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));
app.use((_, r) => r.status(404).send("Route not found"));
app.listen(PORT, () => console.log(`Running on ${PORT}`));
