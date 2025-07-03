const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve index.html from root (not /public)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html")); // ✅ changed from public/index.html
});

app.use(express.json());

app.post("/api/check", async (req, res) => {
  try {
    const { wallet } = req.body;

    const response = await fetch("https://graphql.union.build/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query {
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
        }`,
      }),
    });

    const { data } = await response.json();
    const scores = data?.v2_scores_by_pk;

    if (!scores) {
      return res.status(404).json({ error: "Wallet not found on Union." });
    }

    res.json({ scores });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check eligibility" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
