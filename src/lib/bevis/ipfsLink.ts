/** Browser-safe public gateway link for an IPFS CID. */
export function ipfsLink(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}
