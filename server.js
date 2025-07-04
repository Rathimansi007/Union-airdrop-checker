const express = require("express");
const path = require("path");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ✅ Your API route for /api/check
app.post("/api/check", async (req, res) => {
  try {
    const { wallet } = req.body;

    const response = await fetch("https://graphql.union.build/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query {
            v2_scores_by_pk(address: "${wallet.toLowerCase()}") {
              address
              estimated_u
              volume_score
              diversity_score
              interaction_score
              holding_score
              cosmos_bonus
              union_user_bonus
            }
          }
        `
      })
    });

    const result = await response.json();
    const scores = result?.data?.v2_scores_by_pk;

    if (!scores) {
      return res.status(404).json({ error: "Wallet not found on Union." });
    }

    res.json({ scores });
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Serve static files (like index.html)
app.use(express.static(path.join(__dirname)));

// ✅ Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
