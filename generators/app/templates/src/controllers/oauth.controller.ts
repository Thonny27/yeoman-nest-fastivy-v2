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

  // 👉 GET simple para ver el token generado
  @Get('token')
  async getToken() {
    const token = await this.oauthService.getAccessToken();
    return { access_token: token };
  }

  // 👉 GET para consumir API externa con ese token
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
        message: 'API externa llamada con éxito ✅',
        response: response.data,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('❌ Error en API externa (GET):', error.message);
      } else {
        console.error('❌ Error desconocido:', error);
      }

      throw new HttpException(
        'Error al llamar a API externa',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // 👉 POST para enviar datos autenticados con Bearer Token
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
        message: 'POST a API externa con token exitoso ✅',
        sent: data,
        response: response.data,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('❌ Error en POST externo:', error.message);
      } else {
        console.error('❌ Error desconocido:', error);
      }

      throw new HttpException(
        'Error al hacer POST externo',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // 👉 GET para consumir API externa usando HttpClient resiliente
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
      // El HttpClient de la librería retorna { data } como en safeRequest
      return {
        message: 'Llamada con HttpClient resiliente ✅',
        response: response.data ?? response,
      };
    } catch (error) {
      return {
        message: 'Error al llamar con HttpClient resiliente',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
