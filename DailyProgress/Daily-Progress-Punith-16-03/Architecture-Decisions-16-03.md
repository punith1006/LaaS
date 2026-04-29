# Architecture Decisions

This document records major architecture decisions for the LaaS platform: the reasoning behind them, how they fit together, and their implications for the system. Decisions are described in context rather than in isolation.

---

## 1. Authentication and identity: OAuth + Keycloak SSO as a unified flow

### Context

LaaS must serve two distinct user bases: **public users** (individuals signing up or using Google/GitHub) and **institution users** (students and staff authenticating via their organisation’s SSO, e.g. LaaS Academy). The system needs a single application entry point, consistent session handling, and the ability to apply different policies (e.g. storage provisioning, roles) based on how the user signed in.

### Decision

Implement a **unified authentication and registration flow** where:

- **Public OAuth** (Google, GitHub) and **institution SSO** (Keycloak with brokered IdPs) are both integrated through the same backend auth pipeline.
- Keycloak is the **central identity and broker layer**: it hosts the LaaS realm, fronts the SPA and backend clients, and brokers the institution IdP. Public OAuth providers are configured as additional IdPs in Keycloak where appropriate, so the frontend can offer “Sign in with Google”, “Sign in with GitHub”, and “Sign in with LaaS Academy” from one place.
- The backend **does not** trust multiple token issuers in parallel for API access. Instead, it validates tokens from Keycloak (and, where used, OAuth provider tokens for the login step only), then **issues its own JWTs** for all API calls. Thus every request is authorised using a single claim shape (`sub`, `authType`, `orgId`, `roles`).
- An explicit **auth type** (`local`, `public_oauth`, `university_sso`) is stored on the user and included in JWTs and `/me`. This drives behaviour such as “provision 15GB storage only for `university_sso`” and allows the UI to adapt to the user’s context.

### Rationale

- **Single mental model:** One login/registration flow for the product, with multiple “buttons” (Google, GitHub, SSO) that all lead to the same user and session model.
- **Institution vs public:** Institutions require SSO and often need guarantees (e.g. only their users get persistent storage). Using Keycloak as the broker allows a clear split: brokered IdP = institution SSO, other IdPs = public OAuth, with `authType` reflecting that in the app.
- **Consistent API contract:** Backend and frontend rely on one JWT format and one `/me` shape regardless of IdP, simplifying guards, role checks, and storage logic.
- **Operational flexibility:** Keycloak’s realm and client configuration can be tuned per environment (redirect URIs, secrets, brokered IdP endpoints) without changing application code.

### Implications and relevance in our system

- **User model and DB:** Users have `authType`, optional `keycloak_user_id` / OAuth subject, and organisation/role derived at first login. Migrations and APIs assume this unified model.
- **Registration:** “Registration” is effectively **just-in-time account creation** on first successful login from any supported IdP; there is no separate public sign-up form that bypasses Keycloak/OAuth.
- **Storage provisioning:** Only users with `authType = university_sso` trigger 15GB ZFS provisioning; the backend calls the host provision service only for them. This keeps policy (who gets persistent storage) aligned with identity source.
- **Frontend:** One auth service and one set of routes can drive “Sign in with Google”, “Sign in with GitHub”, and “Sign in with LaaS Academy” without separate code paths for “SSO vs OAuth”.
- **Security and audit:** All logins flow through Keycloak (or through Keycloak-configured OAuth), so audit and session revocation can be reasoned about in one place; the backend only needs to validate Keycloak (and issue its own JWTs) for API access.

---

## 2. Remote streaming: from Guacamole to WebRTC as the primary path for latency-sensitive workloads

### Context

LaaS provides remote access to lab environments (containers, desktops). The first implementation used **Apache Guacamole** (RDP/VNC over a browser client). This worked well for general development and light GUI use but proved inadequate for **latency-sensitive** and **media-heavy** workloads: interactive video editing, real-time Blender rendering, and similar use cases where input lag and frame consistency are critical. The product goal is to support these workflows, not only basic terminals and simple UIs.

### Decision

- **Adopt WebRTC-based streaming** as the **primary** remote-access path for latency-sensitive labs (video editing, real-time 3D, and other high-fidelity interactive sessions).
- **Keep Apache Guacamole** available for **non–latency-sensitive** access (e.g. terminal-only sessions, light GUI tools) where its operational simplicity is an advantage.
- Design the **session and media pipeline** so that:
  - A dedicated WebRTC endpoint (or equivalent media path) is associated with each lab session where low latency is required.
  - Signalling (e.g. REST + WebSocket) coordinates session setup between the browser client and the backend/container-side agent.
  - Authentication and authorization reuse the existing LaaS identity model (backend-issued JWTs, user/session binding) so that only the right user can attach to the right lab.

### Rationale

- **Latency and quality:** WebRTC’s UDP-based transport and tuned encoder pipeline deliver sub-second, frame-accurate interaction that RDP/VNC over Guacamole cannot reliably meet for NLEs and 3D tools.
- **User experience:** For media and 3D labs, the target is “feels local”. That requirement drove the architectural shift rather than incremental tuning of the existing stack.
- **Risk mitigation:** Keeping Guacamole for basic workflows avoids forcing every use case onto WebRTC and preserves a fallback that is well understood and easier to operate for simple scenarios.

### Implications and relevance in our system

- **Two streaming paths:** The system now has two distinct remote-access mechanisms; routing (which labs use WebRTC vs Guacamole) is a product/configuration choice and may be driven by lab type or feature flags.
- **Session lifecycle:** WebRTC sessions require explicit signalling, offer/answer, and teardown; backend and/or agent components must manage this lifecycle and map it to LaaS users and lab instances.
- **Operational and deployment:** WebRTC may require different network/firewall considerations (e.g. TURN/STUN) and possibly different scaling than Guacamole; runbooks and deployment docs should reflect both paths.
- **Consistency with auth:** Regardless of streaming technology, access control is unified: the same login and SSO/OAuth flow and the same JWT-based API auth determine who can open which lab and thus which stream.

---

## Summary

| Decision | Essence | Main implication |
|----------|--------|-------------------|
| **Auth: OAuth + Keycloak SSO** | One unified flow; Keycloak as broker; backend-issued JWTs; `authType` drives policy (e.g. storage). | Single user/session model and one place to enforce “who gets what” (roles, storage, SSO-only features). |
| **Streaming: WebRTC for latency-sensitive** | WebRTC primary for media/3D; Guacamole retained for basic workflows. | Two remote-access paths; product and ops must support both and route workloads appropriately. |

These decisions are linked: the same identity and auth model (Decision 1) underpin who can use which lab and thus who gets access to Guacamole vs WebRTC sessions (Decision 2).
