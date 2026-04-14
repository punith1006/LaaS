import { Injectable, Logger } from '@nestjs/common';

interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
}

interface KeycloakUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
}

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);

  private get baseUrl(): string {
    return process.env.KEYCLOAK_URL || 'http://localhost:8080';
  }

  private get realm(): string {
    return process.env.KEYCLOAK_REALM || 'laas';
  }

  private get clientId(): string {
    return process.env.KEYCLOAK_CLIENT_ID || 'laas-backend';
  }

  private get clientSecret(): string {
    return process.env.KEYCLOAK_CLIENT_SECRET || '';
  }

  get isConfigured(): boolean {
    return !!(
      process.env.KEYCLOAK_URL &&
      process.env.KEYCLOAK_REALM &&
      process.env.KEYCLOAK_CLIENT_ID
    );
  }

  async exchangeCode(
    code: string,
    redirectUri: string,
  ): Promise<KeycloakTokenResponse> {
    const tokenUrl = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`;

    const frontendClientId =
      process.env.KEYCLOAK_FRONTEND_CLIENT_ID || 'laas-frontend';

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: frontendClientId,
      code,
      redirect_uri: redirectUri,
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Token exchange failed: ${err}`);
      throw new Error('Failed to exchange authorization code');
    }

    return res.json();
  }

  async getUserInfo(accessToken: string): Promise<KeycloakUserInfo> {
    const url = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch user info from Keycloak');
    }

    return res.json();
  }

  async triggerPasswordReset(email: string): Promise<void> {
    const adminToken = await this.getAdminToken();

    const usersUrl = `${this.baseUrl}/admin/realms/${this.realm}/users?email=${encodeURIComponent(email)}&exact=true`;
    const usersRes = await fetch(usersUrl, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (!usersRes.ok) {
      throw new Error('Failed to look up user in Keycloak');
    }

    const users = (await usersRes.json()) as { id: string }[];
    if (users.length === 0) {
      return;
    }

    const userId = users[0].id;
    const actionUrl = `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/execute-actions-email`;

    const res = await fetch(actionUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['UPDATE_PASSWORD']),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Password reset trigger failed: ${err}`);
      throw new Error('Failed to send password reset email');
    }
  }

  getAuthUrl(redirectUri: string, idpHint?: string): string {
    const params = new URLSearchParams({
      client_id: process.env.KEYCLOAK_FRONTEND_CLIENT_ID || 'laas-frontend',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
    });

    if (idpHint) {
      params.set('kc_idp_hint', idpHint);
    }

    return `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/auth?${params.toString()}`;
  }

  private async getAdminToken(): Promise<string> {
    const tokenUrl = `${this.baseUrl}/realms/master/protocol/openid-connect/token`;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const adminUser = process.env.KEYCLOAK_ADMIN_USER;
    const adminPass = process.env.KEYCLOAK_ADMIN_PASSWORD;

    if (adminUser && adminPass) {
      body.set('grant_type', 'password');
      body.set('client_id', 'admin-cli');
      body.set('username', adminUser);
      body.set('password', adminPass);
      body.delete('client_secret');
    }

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error('Failed to obtain Keycloak admin token');
    }

    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }
}
