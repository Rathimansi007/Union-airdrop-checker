const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post("/api/check", async (req, res) => {
  const wallet = (req.body.wallet || "").toLowerCase();

  try {
    const response = await fetch("https://graphql.union.build/v1/graphql", {
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
          }
        `,
        variables: { addr: wallet }
      })
    });

    const data = await response.json();
    const score = data?.data?.v2_scores_by_pk;

    if (!score) {
      return res.status(200).json({ success: false, error: "Wallet not found on Union." });
    }

    res.json({ success: true, scores: score });

  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.use(express.static(__dirname));
app.use((req, res) => res.status(404).send("Route not found"));
app.listen(PORT, () => console.log("Server running on port", PORT));
