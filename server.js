// server.js
const express = require("express");
const fetch = require("node-fetch");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post("/api/check", async (req, res) => {
  const { wallet } = req.body;
  try {
    const resp = await fetch("https://graphql.union.build/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query ($addr: String!) {
            v2_scores_by_pk(address: $addr) {
              address estimated_u volume_score diversity_score
              interaction_score holding_score cosmos_bonus union_user_bonus
            }
          }
        `,
        variables: { addr: wallet.toLowerCase() }
      })
    });

    const j = await resp.json();

    if (!j.data?.v2_scores_by_pk || j.data.v2_scores_by_pk.estimated_u === 0) {
      return res.status(404).json({ 
        error: "This wallet has not interacted with Union or is not eligible for $U." 
      });
    }

    res.json({ success: true, scores: j.data.v2_scores_by_pk });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Eligibility check failed." });
  }
});

app.get("/", (req, res) =>
  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Union Airdrop Checker</title>
<style>
body { background:#000;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;padding:20px; }
input, button { font-size:16px;padding:10px;margin:5px;border-radius:6px;border:none; }
input { width: 300px; }
button { background:#1f6feb;cursor:pointer;color:#fff; }
button:hover { background:#388bfd; }
footer { margin-top:30px;color:#888;font-size:14px; }
a { color:#58a6ff;text-decoration:none; }
.result { margin-top:20px;white-space:pre-wrap;text-align:left; }
.share { display:none;margin-top:10px; }
.share a { color:#1da1f2;text-decoration:none;font-size:14px; }
</style>
</head><body>

<img src="https://union.build/logo.svg" alt="Union Logo" width="100">
<h1>🪂 Union Airdrop Checker</h1>
<input id="wallet" placeholder="Enter wallet address (0x…)" />
<button onclick="go()">Check Airdrop</button>
<div class="result" id="res"></div>
<div class="share" id="sh"><a id="shl" target="_blank">🔁 Share on X</a></div>
<footer>Built with ❤️ by <a href="https://x.com/n_web3nft" target="_blank">@n_web3nft</a></footer>

<script>
async function go(){
  const w=document.getElementById("wallet").value.trim();
  const r=document.getElementById("res"), s=document.getElementById("sh");
  r.textContent="⏳ Checking...";
  s.style.display="none";
  try {
    const j = await fetch("/api/check", {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({wallet:w})
    }).then(r=>r.json());
    if(!j.success){
      return r.textContent="❌ "+j.error;
    }
    const o=j.scores, txt=\`
💼 Wallet: \${o.address}
💫 Estimated $U: \${o.estimated_u}

📊 Scores:
• Volume: \${o.volume_score}
• Diversity: \${o.diversity_score}
• Interaction: \${o.interaction_score}
• Holding: \${o.holding_score}
• Cosmos bonus: \${o.cosmos_bonus}
• Union bonus: \${o.union_user_bonus}
\`;
    r.textContent=txt;
    const link = encodeURIComponent(\`I just estimated my $U allocation: \${o.estimated_u} — Check yours at union.build/check\`);
    document.getElementById("shl").href=\`https://twitter.com/intent/tweet?text=\${link}\`;
    s.style.display="block";
  } catch(e){
    r.textContent="❌ Error checking eligibility";
    console.error(e);
  }
}
</script>
</body></html>`)
);

app.use((req,res)=>res.status(404).send("Route not found"));
app.listen(PORT, ()=>console.log("Running on port "+PORT));
