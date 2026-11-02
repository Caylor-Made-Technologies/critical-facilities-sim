/**
 * Certification issuers, credited and linked wherever their certifications
 * appear (Career tab, About page). Links open the issuer's own website.
 * Names and certification titles are trademarks of their owners. This site
 * has no affiliation with, and is not endorsed by, any issuer.
 */

export interface Issuer {
  id: string;
  name: string;
  url: string;
  /** How a cert's "by" text mentions this issuer. */
  match: RegExp;
}

export const ISSUERS: Issuer[] = [
  { id: 'otiec', name: 'OSHA Training Institute Education Centers', url: 'https://www.osha.gov/otiec', match: /OSHA Training Institute/ },
  { id: 'osha', name: 'OSHA Outreach Training Program', url: 'https://www.osha.gov/training/outreach', match: /OSHA Outreach/ },
  { id: 'epa', name: 'U.S. EPA, Section 608', url: 'https://www.epa.gov/section608', match: /\bEPA\b/ },
  { id: 'nfpa', name: 'NFPA (National Fire Protection Association)', url: 'https://www.nfpa.org', match: /NFPA/ },
  { id: 'se', name: 'Schneider Electric (Schneider Electric University)', url: 'https://www.se.com', match: /Schneider Electric/ },
  { id: 'epi', name: 'EPI (data centre training framework)', url: 'https://www.epi-ap.com', match: /\bEPI\b/ },
  { id: 'exin', name: 'EXIN (exam and certification body)', url: 'https://www.exin.com', match: /\bEXIN\b/ },
  { id: 'cnet', name: 'CNet Training', url: 'https://www.cnet-training.com', match: /CNet Training/ },
  { id: 'uptime', name: 'Uptime Institute', url: 'https://uptimeinstitute.com', match: /Uptime Institute/ },
  { id: 'bicsi', name: 'BICSI', url: 'https://www.bicsi.org', match: /\bBICSI\b/ },
  { id: 'bomi', name: 'BOMI International', url: 'https://www.bomi.org', match: /\bBOMI\b/ },
  { id: 'neta', name: 'NETA (InterNational Electrical Testing Association)', url: 'https://www.netaworld.org', match: /InterNational Electrical Testing Association|\bNETA\b/ },
  { id: 'isa', name: 'ISA (International Society of Automation)', url: 'https://www.isa.org', match: /\bISA\b/ },
  { id: 'smrp', name: 'SMRP (Society for Maintenance & Reliability Professionals)', url: 'https://smrp.org', match: /Society for Maintenance/ },
  { id: 'ifma', name: 'IFMA (International Facility Management Association)', url: 'https://www.ifma.org', match: /\bIFMA\b/ },
  { id: 'pmi', name: 'PMI (Project Management Institute)', url: 'https://www.pmi.org', match: /\bPMI\b/ },
  { id: 'aee', name: 'AEE (Association of Energy Engineers)', url: 'https://www.aeecenter.org', match: /Association of Energy Engineers/ },
  { id: 'ashrae', name: 'ASHRAE', url: 'https://www.ashrae.org', match: /\bASHRAE\b/ },
  { id: 'acg', name: 'AABC Commissioning Group', url: 'https://www.commissioning.org', match: /AABC Commissioning Group/ },
  { id: 'bcsp', name: 'BCSP (Board of Certified Safety Professionals)', url: 'https://www.bcsp.org', match: /Board of Certified Safety Professionals/ },
  { id: 'ncees', name: 'NCEES', url: 'https://ncees.org', match: /\bNCEES\b/ },
];

/** Every issuer a cert's "by" text mentions, in list order. */
export function issuersFor(by: string): Issuer[] {
  return ISSUERS.filter((i) => i.match.test(by));
}
