<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Union Airdrop Checker</title>
  <style>
    body { font-family: Arial; background: #000; color: #fff; text-align: center; padding: 50px; }
    input, button { padding: 10px; font-size: 16px; }
    .result { margin-top: 20px; font-size: 18px; }
  </style>
</head>
<body>
  <img src="https://union.build/logo.svg" alt="Union" width="100" />
  <h1>🎈 Union Airdrop Checker</h1>
  <input id="wallet" placeholder="Enter wallet address" size="45" />
  <button onclick="checkAirdrop()">Check Airdrop</button>
  <div class="result" id="result"></div>

  <script>
    async function checkAirdrop() {
      const wallet = document.getElementById("wallet").value;
      const result = document.getElementById("result");
      result.textContent = "Checking...";

      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        result.innerHTML = `✅ Estimated tokens: ${data.estimatedTokens}<br>🎯 Volume Score: ${data.volumeScore}<br>🤝 Interaction Score: ${data.interactionScore}`;
      } catch (err) {
        result.innerHTML = `❌ Failed to check eligibility<br><small>${err.message}</small>`;
      }
    }
  </script>
</body>
</html>
