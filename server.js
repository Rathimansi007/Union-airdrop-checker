const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

async function queryGraphQL(query, variables) {
  const res = await fetch("https://graphql.union.build/v1/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables })
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
          p_limit: 50
        }) {
          base_amount
          base_token_meta {
            representations { symbol decimals }
          }
        }
      }`;
    const transferRes = await queryGraphQL(transferQ, { addrs: [wallet] });
    const transfers = transferRes.data?.v2_transfers || [];

    const activity = {};
    for (const t of transfers) {
      const sym = t.base_token_meta.representations?.[0]?.symbol || "UNKNOWN";
      const dec = t.base_token_meta.representations?.[0]?.decimals || 18;
      const amt = Number(t.base_amount) / (10 ** dec);
      activity[sym] = (activity[sym] || 0) + amt;
    }

    if (!score && transfers.length === 0) {
      return res.json({ success: false, error: "This wallet has not interacted with Union or is not eligible for $U." });
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

app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
