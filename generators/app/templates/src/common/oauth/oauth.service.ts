import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import qs from 'qs';

@Injectable()
export class OAuthService {
  private token: string | null = null;

  constructor(private readonly config: ConfigService) {}

  async getAccessToken(): Promise<string> {
    if (this.token) return this.token;

    const url = this.config.get<string>('oauth.tokenUrl');
    const clientId = this.config.get<string>('oauth.clientId');
    const clientSecret = this.config.get<string>('oauth.clientSecret');

  console.log(' Trying to get token...');
  console.log(' URL:', url);
  console.log(' Client ID:', clientId);
  console.log(' Client Secret:', clientSecret);

    if (!url || !clientId || !clientSecret) {
  throw new Error(' Missing variables in .env');
    }

    const body = qs.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const token = response.data?.form?.client_id
        ? `fake-token-for-${response.data.form.client_id}`
        : 'default-fake-token';

      this.token = token;
  console.log('🔐 Token generated:', token);
      return token;
    } catch (error) {
  console.error('❌ Error calling OAuth endpoint:', error);
      throw new Error('OAuth2 Error');
    }
  }
}