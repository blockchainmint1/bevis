# Eliminate TEXITcoin scan contention

## Goal
Stop routine wallet balance checks and transactions from failing because the node permits only one global `scantxoutset` operation at a time.

## Changes
- Read address UTXOs from the TEXITcoin mempool index first, which does not take the node-wide scan lock.
- Keep the node scan as a fallback for index outages, but remove the unsafe behavior that aborts another request's active scan.
- Validate and normalize indexed UTXOs before transaction construction.
- Add focused tests for indexed results, fallback behavior, and malformed responses.
- Verify the app build and the live admin wallet flow.

## Technical details
The wallet derivation and signing model will not change. Only UTXO discovery changes: `mempool.texitcoin.org/api/address/{address}/utxo` becomes the primary read path, with `scantxoutset` retained as a bounded fallback. This avoids cross-instance lock collisions that an in-memory queue cannot prevent in a serverless deployment.
