const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

async function queryGraphQL(query, vars) {
  const resp = await fetch("https://graphql.union.build/v1/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: vars }),
  });
  return resp.json();
}

// POST /api/check
app.post("/api/check", async (req, res) => {
  const wallet = (req.body.wallet || "").toLowerCase().trim();
  if (!wallet.startsWith("0x")) {
    return res.json({ success: false, error: "Invalid wallet." });
  }
  try {
    // Fetch airdrop scores
    const scoreQ = `
      query($addr: String!) {
        v2_scores_by_pk(address: $addr) {
          address estimated_u volume_score diversity_score
          interaction_score holding_score cosmos_bonus union_user_bonus
        }
      }
    `;
    const { data: d1 } = await queryGraphQL(scoreQ, { addr: wallet });
    const score = d1?.v2_scores_by_pk;
    if (!score) {
      return res.json({ success: false, error: "Wallet not found on Union." });
    }

    // Fetch actual token activity
    const transferQ = `
      query($addr: String!) {
        v2_transfers(args: {
          p_addresses_canonical: [$addr],
          p_limit: 100
        }) {
          base_amount
          base_token_meta {
            representations { symbol decimals }
          }
        }
      }
    `;
    const { data: d2 } = await queryGraphQL(transferQ, { addr: wallet });
    const transfers = Array.isArray(d2?.v2_transfers) ? d2.v2_transfers : [];

    const activity = {};
    transfers.forEach(t => {
      const rep = t.base_token_meta?.representations?.[0];
      if (rep) {
        const symbol = rep.symbol;
        const decimals = rep.decimals || 18;
        const amount = parseFloat(t.base_amount) / Math.pow(10, decimals);
        activity[symbol] = (activity[symbol] || 0) + amount;
      }
    });

    res.json({
      success: true,
      scores: score,
      activity: Object.entries(activity).map(([symbol, amount]) => ({
        symbol,
        amount: amount.toFixed(4)
      }))
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "API error" });
  }
});

app.use(express.static(__dirname));
app.get("/", (req, res) => res.sendFile(`${__dirname}/index.html`));
app.use((_, res) => res.status(404).send("Route not found"));

app.listen(PORT, () => console.log(`Running on port ${PORT}`));
