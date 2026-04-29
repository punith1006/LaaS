# Keycloak: LaaS Academy test institution SSO

This guide sets up a **test university** called **LaaS Academy** in Keycloak so you can test the "Sign in with your institution" flow. LaaS Academy is a second Keycloak realm that acts as the institution IdP; the main **laas** realm brokers to it.

**Prerequisites:** Keycloak running (e.g. `http://localhost:8080`), admin credentials (e.g. `admin` / `admin`).

---

## 1. Create the LaaS Academy realm (the “university”)

1. Log in to Keycloak Admin: `http://localhost:8080/admin` → use your admin username/password.
2. Top-left: open the **realm** dropdown (shows “master” or “laas”) → **Create realm**.
3. **Realm name:** `laas-academy`  
   **Enabled:** ON → **Create**.

You now have a realm `laas-academy` that will act as the institution’s login.

---

## 2. Create a client in laas-academy (for brokering from laas)

The **laas** realm will call laas-academy’s OIDC endpoint. laas-academy needs a client that allows the laas realm to use it.

1. In the realm dropdown, select **laas-academy**.
2. **Clients** → **Create client**.
3. **General settings:**
   - **Client type:** OpenID Connect  
   - **Client ID:** `laas-realm-broker`  
   → **Next**.
4. **Capability config:**
   - **Client authentication:** ON (confidential).  
   - **Authorization:** OFF.  
   - **Authentication flow:** Standard flow ON, Direct access grants ON (or at least Standard flow).  
   → **Next**.
5. **Login settings:**
   - **Root URL:** `http://localhost:8080`
   - **Valid redirect URIs:**  
     `http://localhost:8080/realms/laas/broker/laas-academy/endpoint`  
     (If Keycloak is on another host/port, replace `http://localhost:8080` with your Keycloak base URL.)
   - **Web origins:** `http://localhost:8080` (or `+` to allow all from root URL).  
   → **Save**.
6. Open the **Credentials** tab and copy the **Client secret** (you’ll need it in the laas realm).

---

## 3. Create a test user in laas-academy

1. Still in **laas-academy** realm: **Users** → **Create new user**.
2. **Username:** `student` (or any username).  
   **Email:** `student@laas-academy.example.com`.  
   **First name:** Test, **Last name:** Student (optional).  
   **Email verified:** ON.  
   → **Create**.
3. Open the user → **Credentials** tab → **Set password**.  
   Set a password (e.g. `student123`), turn **Temporary** OFF if you don’t want a forced change.  
   → **Save**.

You’ll use this username/email and password when testing “Sign in with your institution” → LaaS Academy.

---

## 4. Register laas-academy as an IdP in the laas realm

1. Switch realm to **laas**: realm dropdown → **laas**.
2. **Identity providers** → **Add provider** → **OpenID Connect v1.0**.
3. **Alias:** `laas-academy` (must match `idpAlias` in the frontend).
4. **Discovery endpoint:**  
   `http://localhost:8080/realms/laas-academy/.well-known/openid-configuration`  
   (Replace host/port if Keycloak is elsewhere.)  
   Click **Import** so Keycloak fills client ID/secret and other fields from discovery.
5. **Client ID:** `laas-realm-broker`.  
   **Client secret:** paste the secret from step 2.6.  
   **Client authentication:** ON (or leave as imported).
6. **Save**.

---

## 5. Test the flow

1. Open your app (e.g. `http://localhost:3000/signin`).
2. Click **Sign in with your institution** → go to `/institution`.
3. Select **LaaS Academy** → **Continue with SSO**.
4. You should be redirected to Keycloak, then to the laas-academy login (“Sign in to your account”).
5. Log in with the laas-academy user (e.g. **Username or email:** `student` or `student@laas-academy.example.com`, **Password:** the one you set).
6. After success, Keycloak should redirect back to your app (e.g. `/callback` then dashboard).

---

## Summary

| Item            | Value |
|-----------------|--------|
| Test institution name | LaaS Academy |
| Keycloak realm (IdP)  | `laas-academy` |
| IdP alias in laas     | `laas-academy` |
| Broker client (in laas-academy) | `laas-realm-broker` |
| Test user (example)   | `student` / `student@laas-academy.example.com` |
| Test password         | (the one you set in step 3) |

If Keycloak is not on `http://localhost:8080`, replace that base URL everywhere in this guide with your Keycloak URL.

---

## 6. Configure Post-Logout Redirect (Required for Sign-Out)

This step is CRITICAL for proper sign-out functionality. Without it, users will get "Invalid redirect uri" errors when signing out.

1. In Keycloak admin, switch to **`laas`** realm (not laas-academy).
2. Go to **Clients** → **laas-frontend**.
3. Click on **Access settings** tab.
4. Find **Valid post logout redirect URIs** field.
5. Add: `http://localhost:3000/signin`
6. **Save**.

This allows Keycloak's logout endpoint to redirect users back to your app's sign-in page after signing out.

---

## 7. Configure laas-frontend Client Settings (Complete)

For the complete OAuth + SSO setup, ensure your `laas-frontend` client has these settings:

**General Settings:**
| Field | Value |
|-------|-------|
| Client ID | `laas-frontend` |
| Name | `LaaS Frontend` |
| Enabled | ON |

**Access Settings:**
| Field | Value |
|-------|-------|
| Root URL | `http://localhost:3000` |
| Home URL | `http://localhost:3000/signin` |
| Valid redirect URIs | `http://localhost:3000/*` |
| Valid post logout redirect URIs | `http://localhost:3000/signin` |
| Web origins | `http://localhost:3000` |

**Capability Config:**
| Field | Value |
|-------|-------|
| Client authentication | OFF (for public SPA) |
| Authorization | OFF |
| Standard flow | ON (required for OAuth) |
| Direct access grants | OFF |

---

## 8. Session Management in Dual-Realm Architecture

Understanding how sessions work is crucial for debugging auth issues.

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         laas realm                               │
│  (BROKER - All sessions created here)                           │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                 │
│  │  laas-frontend   │    │   Google OAuth   │                 │
│  │     client       │    │    (google)       │                 │
│  └──────────────────┘    └──────────────────┘                 │
│         │                        │                             │
│         └────────────────────────┼─────────────────────────┐   │
│                                  │                         │   │
│                                  ▼                         │   │
│                    ┌─────────────────────┐                 │   │
│                    │  KEYCLOAK_SESSION   │                 │   │
│                    │  KEYCLOAK_IDENTITY  │◄── Browser      │   │
│                    │  (cookies)          │    Cookies       │   │
│                    └─────────────────────┘                 │   │
└──────────────────────────────────────────────────────────────┘   │
                                │                                  │
                                │ (user authenticates here)        │
                                ▼                                  │
┌─────────────────────────────────────────────────────────────────┐
│                     laas-academy realm                           │
│  (INSTITUTION IdP - Only authenticates, does NOT create        │
│   sessions for laas-frontend)                                   │
│                                                                 │
│  ┌──────────────────────┐                                       │
│  │ laas-realm-broker   │                                       │
│  │      client         │◄── Used for brokering SSO             │
│  └──────────────────────┘                                       │
│                                                                 │
│  ┌──────────────────────┐                                       │
│  │   Test Users         │                                       │
│  │   (student)         │◄── Credentials verified here          │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points

1. **All sessions are in laas realm** - Whether a user logs in via Google, GitHub, or LaaS Academy SSO, the session is created in the laas realm.

2. **laas-academy is only for authentication** - It verifies credentials but doesn't create sessions for your app.

3. **Sign-out must target laas realm** - Always logout from `laas` realm using the `laas-frontend` client.

4. **id_token_hint is required** - To logout, you must provide the `id_token` that was issued during login.

---

## 9. Frontend Code Requirements for Proper Sign-Out

### Required Environment Variables (.env.local)

```bash
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=laas
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=laas-frontend
```

### Required Token Storage (src/lib/token.ts)

```typescript
const ID_TOKEN_KEY = "laas_id_token";

export function saveTokens(tokens: AuthTokens & { idToken?: string }): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  if (tokens.idToken) {
    localStorage.setItem(ID_TOKEN_KEY, tokens.idToken);
  }
}

export function getIdToken(): string | null {
  return localStorage.getItem(ID_TOKEN_KEY);
}
```

### Sign-Out Flow (src/components/app-shell.tsx)

```typescript
const performSignOut = () => {
  // Get ID token BEFORE clearing storage
  const idToken = getIdToken();
  
  // Clear local tokens
  localStorage.clear();
  sessionStorage.clear();
  
  // Build Keycloak logout URL
  const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
  const keycloakRealm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "laas";
  const appUrl = window.location.origin;
  
  if (keycloakUrl) {
    let logoutUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/logout`;
    const params = new URLSearchParams();
    
    if (idToken) {
      params.set("id_token_hint", idToken);
    }
    params.set("post_logout_redirect_uri", `${appUrl}/signin`);
    logoutUrl += `?${params.toString()}`;
    
    window.location.href = logoutUrl;
  } else {
    router.push("/signin");
  }
};
```

### OAuth Buttons with prompt=login (src/components/auth/oauth-buttons.tsx)

```typescript
function getOAuthUrl(provider: "google" | "github"): string {
  const callbackUrl = `${window.location.origin}/callback`;

  if (KEYCLOAK_URL && KEYCLOAK_REALM && KEYCLOAK_CLIENT_ID) {
    sessionStorage.clear();  // Clear any lingering session data
    
    const params = new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      kc_idp_hint: provider,
      prompt: "login",  // Forces fresh authentication
    });
    params.append("_", Date.now().toString());  // Cache bust
    return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?${params.toString()}`;
  }

  return "/dashboard";
}
```

---

## 10. Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid redirect uri" | Post-logout redirect not configured | Add `http://localhost:3000/signin` to Valid post logout redirect URIs |
| "Missing parameters: id_token_hint" | Logout called without id_token | Store id_token during login, use in logout URL |
| "Invalid parameter: id_token_hint" | id_token from wrong realm | Ensure both OAuth and SSO use laas realm |
| "Client not found" in laas-academy | Trying to logout from wrong realm | Always logout from laas realm |
| "Already authenticated" after sign-out | Session not terminated | Verify id_token is stored, check logout URL |
| Blank page after sign-out | post_logout_redirect_uri not whitelisted | Configure redirect URI in client settings |

---

## 11. Testing the Complete Flow

### Test 1: SSO → Sign Out → Google OAuth
1. Clear all cookies for localhost:8080
2. Go to app → Sign in with institution → LaaS Academy
3. Login with student credentials
4. Click Sign Out
5. Should redirect to Keycloak logout, then to /signin
6. Click Google Sign In
7. Should show Google login (NOT "already authenticated" error)

### Test 2: Google OAuth → Sign Out → SSO
1. Clear all cookies for localhost:8080
2. Go to app → Google Sign In
3. Complete Google authentication
4. Click Sign Out
5. Should redirect to Keycloak logout, then to /signin
6. Click Sign in with institution → LaaS Academy
7. Should show LaaS Academy login (NOT "already authenticated" error)

### Test 3: Same Account Re-login
1. Login via any method
2. Sign Out
3. Login again via same method
4. Should work without any errors
