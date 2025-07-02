<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Union Airdrop Checker</title>
  <link rel="icon" href="https://union.build/logo.svg" />
  <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
  <style>
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background-color: #0e0e0e;
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }

    .logo {
      width: 120px;
      margin-bottom: 1rem;
    }

    h1 {
      margin-top: 0;
      font-size: 1.75rem;
      color: #ffffff;
    }

    .container {
      max-width: 600px;
      width: 100%;
      text-align: center;
    }

    input {
      padding: 0.8rem;
      width: 100%;
      font-size: 1rem;
      border-radius: 10px;
      border: none;
      margin-top: 1rem;
      box-sizing: border-box;
    }

    button {
      margin-top: 1rem;
      padding: 0.8rem 2rem;
      font-size: 1rem;
      border: none;
      background-color: #6f4cff;
      color: white;
      border-radius: 10px;
      cursor: pointer;
      transition: 0.3s ease;
    }

    button:hover {
      background-color: #5a3acc;
    }

    .result {
      margin-top: 2rem;
      background-color: #1a1a1a;
      padding: 1.5rem;
      border-radius: 12px;
      text-align: left;
    }

    .token-activity, .factor-breakdown {
      margin-top: 1.5rem;
    }

    .token-table, .factor-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0.5rem;
    }

    .token-table th, .token-table td,
    .factor-table th, .factor-table td {
      padding: 0.5rem;
      text-align: left;
      border-bottom: 1px solid #333;
    }

    .footer {
      margin-top: 3rem;
      font-size: 0.9rem;
      color: #aaa;
    }

    .footer a {
      color: #6f4cff;
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    #shareButton {
      background-color: #1db954;
      margin-left: 1rem;
    }

    #shareButton:hover {
      background-color: #17a148;
    }
  </style>
</head>
<body>
  <img class="logo" src="https://union.build/logo.svg" alt="Union Logo" />
  <div class="container">
    <h1>🪂 Union Airdrop Checker</h1>
    <input type="text" id="walletInput" placeholder="Enter wallet address (0x...)" />
    <button onclick="checkAirdrop()">Check Airdrop</button>

    <div id="result" class="result" style="display: none;">
      <div id="walletDisplay"></div>

      <div class="token-activity">
        <h3>💰 Estimated Token Activity:</h3>
        <table class="token-table" id="tokenTable">
          <thead>
            <tr><th>Symbol</th><th>Amount</th><th>USD</th></tr>
          </thead>
          <tbody></tbody>
        </table>
        <div id="totalVolume" style="margin-top: 0.5rem;"></div>
      </div>

      <div style="margin-top: 1.5rem;">
        <h3>🪂 Estimated $U Airdrop:</h3>
        <div id="estimatedU" style="font-weight: bold; font-size: 1.25rem;"></div>
      </div>

      <div class="factor-breakdown">
        <h3>📊 Factor Breakdown:</h3>
        <table class="factor-table">
          <tbody id="factorTable"></tbody>
        </table>
      </div>

      <button id="shareButton" onclick="shareResult()">📤 Share</button>
    </div>

    <div id="error" style="color: red; margin-top: 1.5rem;"></div>
  </div>

  <div class="footer">
    Built with ❤️ by <a href="https://x.com/n_web3nft" target="_blank">@n_web3nft</a>
  </div>

  <script>
    async function checkAirdrop() {
      const wallet = document.getElementById("walletInput").value.trim();
      if (!wallet || !wallet.startsWith("0x")) {
        document.getElementById("error").innerText = "❌ Please enter a valid wallet address.";
        return;
      }

      document.getElementById("error").innerText = "";
      document.getElementById("result").style.display = "none";

      try {
        const res = await fetch("http://localhost:3000/airdrop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.details || "Failed to check eligibility");

        document.getElementById("walletDisplay").innerHTML = `💼 Wallet:<br>${data.wallet}`;

        const tokenTable = document.getElementById("tokenTable").querySelector("tbody");
        tokenTable.innerHTML = "";
        data.activityArray.forEach((token) => {
          const row = `<tr>
            <td>${token.symbol}</td>
            <td>${token.amount}</td>
            <td>$${parseFloat(token.usd).toFixed(2)}</td>
          </tr>`;
          tokenTable.innerHTML += row;
        });

        document.getElementById("totalVolume").innerText = `→ Total volume: $${parseFloat(data.estimatedVolumeUSD).toFixed(2)}`;

        document.getElementById("estimatedU").innerText = `Estimated Allocation: ${parseFloat(data.estimatedU).toFixed(2)} $U`;

        const factors = data.factors || {};
        const factorTable = document.getElementById("factorTable");
        factorTable.innerHTML = `
          <tr><td>📦 Volume Score</td><td>${factors.volumeScore ?? 0}</td></tr>
          <tr><td>🌈 Diversity Score</td><td>${factors.diversityScore ?? 0}</td></tr>
          <tr><td>🔁 Interaction Score</td><td>${factors.interactionScore ?? 0}</td></tr>
          <tr><td>⏳ Holding Score</td><td>${factors.holdingScore ?? 0}</td></tr>
          <tr><td>🌌 Cosmos Bonus</td><td>${factors.cosmosBonus ?? 0}</td></tr>
          <tr><td>🟢 Union Bonus</td><td>${factors.unionUserBonus ?? 0}</td></tr>
        `;

        document.getElementById("result").style.display = "block";
      } catch (err) {
        document.getElementById("error").innerText = `❌ ${err.message}`;
      }
    }

    function shareResult() {
      const result = document.getElementById("result");
      html2canvas(result, { backgroundColor: "#0e0e0e" }).then(canvas => {
        const link = document.createElement("a");
        link.download = "union-airdrop.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      });
    }
  </script>
</body>
</html>
