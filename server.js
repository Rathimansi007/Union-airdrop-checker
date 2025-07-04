// server.js
const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname)); // serve static files from root

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/api/check", async (req, res) => {
  const wallet = (req.body.wallet || "").toLowerCase();
  try {
    const resp = await fetch("https://graphql.union.build/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query($addr: String!) {
            v2_scores_by_pk(address: $addr) {
              address
              estimated_u
              volume_score
              diversity_score
              interaction_score
              holding_score
              cosmos_bonus
              union_user_bonus
            }
          }`,
        variables: { addr: wallet }
      })
    });
    const data = await resp.json();
    const scores = data.data?.v2_scores_by_pk;

    if (!scores) return res.json({ success: false, error: "No $U data – wallet not found." });

    res.json({ success: true, scores });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "API error" });
  }
});

app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});
