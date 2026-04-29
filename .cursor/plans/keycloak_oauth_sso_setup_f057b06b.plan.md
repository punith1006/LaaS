---
name: Keycloak OAuth SSO setup
overview: Deploy Keycloak 26.x locally, configure Google/GitHub OAuth identity providers, wire frontend OAuth buttons and backend JWT validation through Keycloak, set up forgot-password flow, and prepare Institution SSO with a test IdP.
todos:
  - id: keycloak-deploy
    content: Deploy Keycloak 26.x locally via Docker, create 'laas' realm and clients
    status: completed
  - id: google-oauth-creds
    content: Guide user through Google Cloud Console to create OAuth credentials
    status: completed
  - id: github-oauth-creds
    content: Guide user through GitHub Developer Settings to create OAuth app
    status: completed
  - id: keycloak-idp-config
    content: Configure Google and GitHub as identity providers in Keycloak realm
    status: completed
  - id: backend-jwks
    content: Update JWT strategy to validate Keycloak RS256 tokens via JWKS
    status: completed
  - id: backend-oauth-callback
    content: Add OAuth callback endpoint to exchange Keycloak code for tokens and create/link user
    status: completed
  - id: backend-forgot-password
    content: Add forgot-password endpoint using Keycloak Admin API
    status: completed
  - id: frontend-oauth-redirect
    content: Update OAuth buttons to redirect to Keycloak with kc_idp_hint
    status: completed
  - id: frontend-callback-page
    content: Create /callback page to handle Keycloak OAuth redirect
    status: completed
  - id: frontend-forgot-password
    content: Wire forgot-password link to Keycloak reset flow
    status: completed
  - id: institution-sso-test
    content: Set up test university realm in Keycloak and wire institution selector
    status: in_progress
isProject: false
---

# Keycloak + OAuth + SSO + Forgot Password

## Overview

Everything routes through Keycloak as the single identity broker. Keycloak handles Google/GitHub OAuth, university SSO, and password reset. The NestJS backend validates Keycloak-issued JWTs (RS256 via JWKS). The existing email/password signup flow (send-otp, verify-otp) stays as-is since it creates users directly; those users will also exist in Keycloak via Admin API sync.

---

## Phase 1: Keycloak Deployment (local)

### 1a. Run Keycloak via Docker

The simplest local setup. No docker-compose -- single container:

```bash
docker run -d --name keycloak-laas \
  -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:26.2.4 start-dev
```

Keycloak admin console: `http://localhost:8080/admin` (admin/admin)

### 1b. Create "laas" realm

- In admin console: Create Realm -> name: `laas`
- Realm settings: Enable user registration = OFF (we handle registration ourselves), email as username = ON

### 1c. Create backend client

- Clients -> Create: Client ID = `laas-backend`, Client Protocol = `openid-connect`
- Access Type: `confidential`
- Valid redirect URIs: `http://localhost:3001/*`
- Web Origins: `http://localhost:3000`
- Note the **Client Secret** from the Credentials tab

### 1d. Create frontend client

- Clients -> Create: Client ID = `laas-frontend`, Client Protocol = `openid-connect`
- Access Type: `public` (SPA, no secret)
- Valid redirect URIs: `http://localhost:3000/`*
- Web Origins: `http://localhost:3000`
- Enable "Standard flow" and "Direct access grants"

---

## Phase 2: Google OAuth Credentials

User needs to create these manually in Google Cloud Console:

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com) -> APIs & Services -> Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Authorized redirect URI: `http://localhost:8080/realms/laas/broker/google/endpoint`
4. Note the **Client ID** and **Client Secret**

Then in Keycloak:

- Identity Providers -> Add -> Google
- Client ID + Secret from step above
- Default scopes: `openid email profile`
- First login flow: leave default (auto-create user on first login)

---

## Phase 3: GitHub OAuth Credentials

User needs to create these manually in GitHub:

1. Go to [https://github.com/settings/developers](https://github.com/settings/developers) -> OAuth Apps -> New OAuth App
2. Homepage URL: `http://localhost:3000`
3. Authorization callback URL: `http://localhost:8080/realms/laas/broker/github/endpoint`
4. Note the **Client ID** and **Client Secret**

Then in Keycloak:

- Identity Providers -> Add -> GitHub
- Client ID + Secret from step above
- Default scopes: `user:email`

---

## Phase 4: Backend Changes

### 4a. Add Keycloak config to `backend/.env`

```
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=laas
KEYCLOAK_CLIENT_ID=laas-backend
KEYCLOAK_CLIENT_SECRET=<from keycloak>
```

### 4b. Update JWT validation to support both HS256 (existing) and RS256 (Keycloak)

In `[backend/src/auth/jwt.strategy.ts](backend/src/auth/jwt.strategy.ts)`:

- Use `jwks-rsa` library for Keycloak JWKS endpoint (`http://localhost:8080/realms/laas/protocol/openid-connect/certs`)
- Or use `passport-jwt` with `secretOrKeyProvider` to handle both issuers

### 4c. Add OAuth callback endpoint

New endpoint `GET /api/auth/oauth/callback` that:

1. Receives the authorization code from Keycloak redirect
2. Exchanges code for Keycloak tokens
3. Looks up or creates user in our DB (by Keycloak `sub` claim or email)
4. Sets `keycloakSub`, `authType` = `oauth_google` or `oauth_github`, `oauthProvider`
5. Assigns `public_user` role + public org if new user
6. Issues our own JWT (or uses Keycloak's directly)

### 4d. Add forgot-password endpoint

`POST /api/auth/forgot-password` -- takes email, triggers Keycloak's password reset email via Admin API.

---

## Phase 5: Frontend Changes

### 5a. Update OAuth buttons

In `[frontend/src/components/auth/oauth-buttons.tsx](frontend/src/components/auth/oauth-buttons.tsx)`:

- Google button redirects to: `{KEYCLOAK_URL}/realms/laas/protocol/openid-connect/auth?client_id=laas-frontend&redirect_uri={CALLBACK_URL}&response_type=code&scope=openid email profile&kc_idp_hint=google`
- GitHub button redirects to same URL with `kc_idp_hint=github`

### 5b. Add OAuth callback page

New route `frontend/src/app/(auth)/callback/page.tsx`:

- Receives `?code=...` from Keycloak redirect
- Sends code to backend `POST /api/auth/oauth/callback`
- Stores returned tokens
- Redirects to `/dashboard`

### 5c. Update forgot-password link

In sign-in form, "Forgot your password?" links to Keycloak's account management or triggers our API endpoint.

### 5d. Add Keycloak env vars to frontend

```
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=laas
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=laas-frontend
```

---

## Phase 6: Institution SSO (test setup)

### 6a. Create a test university IdP

For testing without a real university, configure Keycloak-as-IdP:

- Create a second realm `test-university` in the same Keycloak instance
- Create a test user in that realm
- In the `laas` realm, add SAML or OIDC identity provider pointing to `test-university` realm
- Set alias: `test-university`

### 6b. Update institution selector

- Frontend institution list includes the test university
- On "Continue with SSO", redirect to Keycloak with `kc_idp_hint=test-university`
- Callback flow same as OAuth

---

## Execution order

The implementation order is: 1a -> 1b -> 1c -> 1d (Keycloak infra, requires user interaction in admin console) -> 2+3 (Google/GitHub creds, requires user to create in cloud consoles) -> 4a-4d (backend code) -> 5a-5d (frontend code) -> 6 (SSO test)

Steps 1-3 require manual user actions in web consoles. I can automate steps 4-6 (all code changes). I can also provide exact step-by-step screenshots/instructions for the manual steps.

---

## Dependencies to install

- Backend: `jwks-rsa` (for Keycloak JWKS validation), `@keycloak/keycloak-admin-client` (for Admin API calls like forgot-password)
- Frontend: none (pure redirect-based OAuth)

