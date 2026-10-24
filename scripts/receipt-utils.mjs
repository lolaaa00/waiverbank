/** Studio receipts may append cancelled validators after the actual leader. */
export function executionLeader(receipt) {
  const entries = receipt.consensus_data?.leader_receipt;
  const leaders = (Array.isArray(entries) ? entries : [entries])
    .filter(entry => entry?.mode === 'leader');
  return leaders.at(-1);
}
