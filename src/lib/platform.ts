// Shared platform display helpers used by LeadCard and LeadKanbanCard.

/** Human-readable full label for a platform value stored on a lead. */
export function platformLabel(platform: string): string {
  const p = (platform || '').toLowerCase();
  if (p === 'facebook' || p === 'facebook group') return 'Facebook';
  if (p === 'reddit') return 'Reddit';
  if (p === 'instagram') return 'Instagram';
  if (p === 'linkedin') return 'LinkedIn';
  if (p === 'nextdoor') return 'Nextdoor';
  if (p === 'threads') return 'Threads';
  if (p === 'twitter' || p === 'x') return 'X / Twitter';
  return platform || 'Web';
}

/** Short uppercase abbreviation for use in compact badges. */
export function platformAbbr(platform: string): string {
  const p = (platform || '').toLowerCase();
  if (p.includes('facebook')) return 'FB';
  if (p === 'reddit') return 'Reddit';
  if (p === 'instagram') return 'IG';
  if (p === 'linkedin') return 'LI';
  if (p === 'nextdoor') return 'ND';
  if (p === 'threads') return 'Threads';
  if (p === 'twitter' || p === 'x') return 'X';
  return platform || 'Web';
}
