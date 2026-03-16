# Keycloak Setup for LaaS

This document describes how to deploy and configure Keycloak 26.x for the LaaS auth flows.

## Deployment

- Deploy Keycloak 26.x (standalone or container). No docker-compose is used at project root; run Keycloak separately.
- Configure admin credentials and base URL (e.g. `http://localhost:8080`).

## Realms

### 1. Public realm (e.g. `laas-public`)

Used for **Personal Access**: email/password sign-up and sign-in, and OAuth (Google, GitHub).

- **Client**: Create a confidential or public client for the LaaS frontend (with redirect URIs for local/dev).
- **Identity providers**:
  - **Local registration**: Enable "Registration allowed" in realm settings so users can register with email/password.
  - **Google**: Add identity provider, type OIDC. Configure with Google OAuth client ID and secret. Map claims (email, name) to user profile.
  - **GitHub**: Add identity provider, type OIDC. Configure with GitHub OAuth App client ID and secret. Map claims to user profile.

JWT issued by this realm can be validated by the backend (RS256, JWKS from Keycloak).

### 2. University realm (e.g. `laas-university`)

Used for **Academic Access**: institution SSO only (sign-in, no sign-up form).

- **Identity providers**: One or more IdPs per institution (SAML 2.0 or OIDC).
- Use **IdP picker** or **kc_idp_hint** so the frontend can redirect to a specific institution’s IdP.

## IdP metadata requirements

### SAML 2.0

- **Entity ID**: IdP entity ID (urn or URL).
- **SSO URL**: Single Sign-On HTTP POST or Redirect URL.
- **Certificate**: IdP signing certificate (X.509) for assertion verification.
- Optional: Attribute mapping (email, name, groups) to Keycloak user profile.

### OIDC

- **Issuer**: IdP issuer URL (e.g. `https://idp.university.edu/oidc`).
- **Authorization endpoint**: URL for authorization requests.
- **Token endpoint**: URL for token exchange.
- **UserInfo endpoint**: URL for user info (optional).
- **Client ID / Secret**: If the IdP requires client registration.
- **Scopes**: e.g. `openid email profile`.

## MVP

- For MVP, the backend can use **app-issued JWT** (HS256/RS256) for email/password and OTP flows, and use Keycloak only for OAuth and university SSO.
- Alternatively, create users in Keycloak via Admin API after OTP verification and use Keycloak as the single JWT issuer (Option A in the plan).
