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
