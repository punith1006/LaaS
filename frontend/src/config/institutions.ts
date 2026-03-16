/**
 * Mock institution list for Academic Access (SSO) selector.
 * Replace with API or Keycloak IdP list when integrated.
 */

export interface Institution {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  idpAlias?: string;
}

export const MOCK_INSTITUTIONS: Institution[] = [
  { id: "1", name: "K.S.R. College of Engineering", slug: "ksrce", domain: "ksrce.ac.in" },
  { id: "2", name: "IIT Madras", slug: "iitm", domain: "iitm.ac.in" },
  { id: "3", name: "Anna University", slug: "anna", domain: "annauniv.edu" },
  { id: "4", name: "PSG College of Technology", slug: "psg", domain: "psgtech.ac.in" },
  { id: "5", name: "VIT Vellore", slug: "vit", domain: "vit.ac.in" },
];
