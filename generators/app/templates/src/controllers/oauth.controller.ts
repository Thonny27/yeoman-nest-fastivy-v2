import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { OAuthService } from '../../../common/oauth/oauth.service';
import axios from 'axios';
import { HttpClient } from 'ads-commons-httpclient-nodejs-lib';

@Controller('oauth')
export class OAuthController {
  private readonly httpClient: HttpClient;

  constructor(private readonly oauthService: OAuthService) {
    this.httpClient = new HttpClient();
  }

  // 👉 Simple GET to view the generated token
  @Get('token')
  async getToken() {
    const token = await this.oauthService.getAccessToken();
    return { access_token: token };
  }

  // 👉 GET to consume external API with that token
  @Get('test-api-call')
  async callExternalApi() {
    try {
      const token = await this.oauthService.getAccessToken();

      const response = await axios.get('https://httpbin.org/anything', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return {
  message: 'External API called successfully ✅',
        response: response.data,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
  console.error('❌ Error in external API (GET):', error.message);
      } else {
  console.error('❌ Unknown error:', error);
      }

      throw new HttpException(
  'Error calling external API',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // 👉 POST to send authenticated data with Bearer Token
  @Post('test-post-call')
  async callExternalPost(@Body() data: any) {
    try {
      const token = await this.oauthService.getAccessToken();

      const response = await axios.post('https://httpbin.org/anything', data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return {
  message: 'POST to external API with token successful ✅',
        sent: data,
        response: response.data,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
  console.error('❌ Error in external POST:', error.message);
      } else {
  console.error('❌ Unknown error:', error);
      }

      throw new HttpException(
  'Error making external POST',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // 👉 GET to consume external API using resilient HttpClient
  @Get('test-api-call-with-circuit')
  async callWithBreaker() {
    const token = await this.oauthService.getAccessToken();
    try {
      const response = await this.httpClient.get(
        'https://httpbin.org/anything',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
  // The HttpClient from the library returns { data } as in safeRequest
      return {
  message: 'Call with resilient HttpClient ✅',
        response: response.data ?? response,
      };
    } catch (error) {
      return {
  message: 'Error calling with resilient HttpClient',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
