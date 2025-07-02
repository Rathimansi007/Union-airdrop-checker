const { request, gql } = require("graphql-request");
const fs = require("fs");

const endpoint = "https://graphql.union.build/v1/graphql";
const FETCH_LIMIT = 100;
let sortOrder = null;
let hasMore = true;
const uniqueAddresses = new Set();
const allTransfers = [];

async function fetchTransfers(cursor = null) {
  let query;
  let variables;

  if (cursor) {
    query = gql`
      query GetTransfers($limit: Int!, $sortOrder: String!, $comparison: String!) {
        v2_transfers(args: {
          p_limit: $limit,
          p_sort_order: $sortOrder,
          p_comparison: $comparison
        }) {
          sender_canonical
          receiver_canonical
          base_amount
          sort_order
        }
      }
    `;
    variables = {
      limit: FETCH_LIMIT,
      sortOrder: cursor,
      comparison: "lt"
    };
  } else {
    query = gql`
      query GetTransfers($limit: Int!) {
        v2_transfers(args: {
          p_limit: $limit
        }) {
          sender_canonical
          receiver_canonical
          base_amount
          sort_order
        }
      }
    `;
    variables = { limit: FETCH_LIMIT };
  }

  const data = await request(endpoint, query, variables);
  return data.v2_transfers;
}

async function main() {
  console.log("⏳ Fetching up to 100K Union transfers...");

  while (hasMore && allTransfers.length < 100000) {
    const transfers = await fetchTransfers(sortOrder);

    if (!transfers || !transfers.length) {
      hasMore = false;
      break;
    }

    for (const tx of transfers) {
      uniqueAddresses.add(tx.sender_canonical);
      uniqueAddresses.add(tx.receiver_canonical);
      allTransfers.push(tx);
    }

    sortOrder = transfers[transfers.length - 1].sort_order;
    console.log(`Fetched ${allTransfers.length} transfers so far...`);
  }

  fs.writeFileSync("transfers.json", JSON.stringify(allTransfers, null, 2));
  fs.writeFileSync("addresses.json", JSON.stringify(Array.from(uniqueAddresses), null, 2));
  console.log(`✅ Done. ${allTransfers.length} transfers, ${uniqueAddresses.size} unique addresses saved.`);
}

main().catch((err) => {
  console.error("❌ Error fetching transfers:", err.message);
});
