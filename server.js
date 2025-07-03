const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (your HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// API route for checking wallet
app.get('/api/check', async (req, res) => {
  const wallet = req.query.wallet?.toLowerCase();

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  try {
    const query = {
      query: `
        query GetScore($address: String!) {
          v2_scores_by_pk(address: $address) {
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
      variables: { address: wallet }
    };

    const response = await fetch('https://graphql.union.build/v1/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });

    const data = await response.json();

    if (!data.data || !data.data.v2_scores_by_pk) {
      return res.status(404).json({ error: 'Wallet not found on Union.' });
    }

    res.json({ data: data.data.v2_scores_by_pk });
  } catch (error) {
    console.error('Error fetching Union data:', error);
    res.status(500).json({ error: 'Failed to fetch Union data' });
  }
});

// Default route (optional fallback if HTML isn't served correctly)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
