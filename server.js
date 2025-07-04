const express = require("express");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ✅ API route — must be defined before static serving
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
    console.error("Error checking eligibility:", err);
    res.status(500).json({ error: "Error checking eligibility" });
  }
});

// ✅ Serve all static files from root
app.use(express.static(__dirname));

// ✅ Serve index.html on "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ Catch-all route
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
