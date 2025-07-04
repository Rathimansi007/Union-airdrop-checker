app.post("/api/check", async (req, res) => {
  const wallet = (req.body.wallet || "").toLowerCase();
  try {
    // 1. Check scores
    const scoreQ = `
      query($addr: String!) {
        v2_scores_by_pk(address: $addr) {
          address estimated_u volume_score diversity_score
          interaction_score holding_score cosmos_bonus union_user_bonus
        }
      }`;
    const scoreRes = await queryGraphQL(scoreQ, { addr: wallet });
    const score = scoreRes.data?.v2_scores_by_pk;

    // 2. Check transfers (whether or not eligible)
    const transferQ = `
      query($addrs: [String!]!) {
        v2_transfers(args: {
          p_addresses_canonical: $addrs,
          p_limit: 100
        }) {
          base_amount
          base_token_meta {
            representations { symbol decimals }
          }
        }
      }`;
    const transferRes = await queryGraphQL(transferQ, { addrs: [wallet] });
    const transfers = transferRes.data?.v2_transfers || [];

    const activity = {};
    for (const t of transfers) {
      const sym = t.base_token_meta.representations[0].symbol;
      const dec = t.base_token_meta.representations[0].decimals;
      const amt = Number(t.base_amount) / (10 ** dec);
      activity[sym] = (activity[sym] || 0) + amt;
    }

    if (!score && transfers.length > 0) {
      return res.json({
        success: false,
        error: "This wallet has interacted with Union, but is not eligible for $U.",
        activity: Object.entries(activity).map(([symbol, amount]) => ({ symbol, amount }))
      });
    }

    if (!score && transfers.length === 0) {
      return res.json({
        success: false,
        error: "No $U data – wallet not found.",
      });
    }

    res.json({
      success: true,
      scores: score,
      activity: Object.entries(activity).map(([symbol, amount]) => ({ symbol, amount }))
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "API error" });
  }
});
