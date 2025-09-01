import { Controller, Get, Body, Post } from '@nestjs/common';
import { ApiResponse } from '../../../interfaces/api-response.interface';
import { CustomRequest } from '../../../interfaces/custom-request.interface';
import { HttpClient } from 'ads-commons-httpclient-nodejs-lib';
@Controller('http-client')
export class HttpClientController {
  private readonly httpClient: HttpClient;
  constructor() {
    this.httpClient = new HttpClient();
  }
  // Example of orchestration, composition, and aggregation
  @Get('rest')
  async orquestar(): Promise<ApiResponse> {
    const start = Date.now();
    const path = '/http-client/rest';
    const errors: Array<{ key?: string; message: string; detail?: any }> = [];
    let uuidRes, getRes, postResults;
    try {
      // 1. Orchestration: first get uuid
      uuidRes = await this.safeRequest({
        url: 'https://httpbin.org/uuid',
        method: 'get',
      });
      if (uuidRes.error) errors.push({ key: 'uuid', message: uuidRes.error });
      // 2. Composition: use uuid in the next GET
      getRes = await this.safeRequest({
        url:
          'https://httpbin.org/get?uuid=' +
          encodeURIComponent(uuidRes?.data?.uuid || ''),
        method: 'get',
      });
      if (getRes.error) errors.push({ key: 'get', message: getRes.error });
      // 3. Aggregation: make two POST requests in parallel and aggregate the results
      const postEndpoints = [
        {
          key: 'post1',
          url: 'https://httpbin.org/post',
          method: 'post',
          data: { foo: 'bar', uuid: uuidRes?.data?.uuid },
        },
        {
          key: 'post2',
          url: 'https://httpbin.org/post',
          method: 'post',
          data: { hello: 'world', uuid: uuidRes?.data?.uuid },
        },
      ];
      postResults = await Promise.all(
        postEndpoints.map(({ url, method, data, key }) =>
          this.safeRequest({ url, method: method as 'get' | 'post', data }),
        ),
      );
      postResults.forEach((res, idx) => {
        if (res.error)
          errors.push({ key: postEndpoints[idx].key, message: res.error });
      });
      const cookedData = {
        uuid: uuidRes.data?.uuid || null,
        get: getRes.data?.args || null,
        post1: postResults[0].data?.json || null,
        post2: postResults[1].data?.json || null,
      };
      return {
        success: errors.length === 0,
        timestamp: new Date().toISOString(),
        path,
        data: cookedData,
        meta: {
          durationMs: Date.now() - start,
          orchestrated: true,
          composed: true,
          aggregated: true,
        },
        errors,
      };
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        timestamp: new Date().toISOString(),
        path,
        data: {},
        meta: { durationMs: Date.now() - start },
        errors,
      };
    }
  }
  // POST endpoint to receive custom requests
  @Post('custom')
  async customOrchestration(@Body() body: CustomRequest): Promise<ApiResponse> {
    const start = Date.now();
    const path = '/http-client/custom';
    const errors: Array<{ key?: string; message: string; detail?: any }> = [];
    if (!body.endpoints || !Array.isArray(body.endpoints)) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        path,
        data: {},
        meta: { durationMs: Date.now() - start },
        errors: [{ message: 'Invalid endpoints array' }],
      };
    }
    // Performance: parallel requests
    const results = await Promise.all(
      body.endpoints.map(async ({ url, method, data, key }) => {
        const res = await this.safeRequest({ url, method, data });
        if (res.error) errors.push({ key, message: res.error });
        // Process the data: only expose relevant json or data
        return [key, res.data?.json ?? res.data ?? null];
      }),
    );
    return {
      success: errors.length === 0,
      timestamp: new Date().toISOString(),
      path,
      data: Object.fromEntries(results),
      meta: {
        durationMs: Date.now() - start,
        parallel: true,
        aggregated: true,
      },
      errors,
    };
  }
  private async safeRequest(endpoint: {
    url: string;
    method: 'get' | 'post';
    data?: any;
  }): Promise<{ data: any; error?: any }> {
    try {
      let res;
      if (endpoint.method === 'get') {
        res = await this.httpClient.get(endpoint.url);
      } else {
        res = await this.httpClient.post(endpoint.url, endpoint.data);
      }
      if (res && typeof res === 'object' && 'data' in res) {
        return { data: (res as any).data };
      }
      return { data: res };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }
  // New endpoint that uses custom circuit breaker configuration with known httpbin endpoint
  @Get('custom-circuit')
  async getWithCustomCircuit(): Promise<ApiResponse> {
    const start = Date.now();
    const path = '/http-client/custom-circuit';
    const errors: Array<{ key?: string; message: string; detail?: any }> = [];
    // Example custom configuration for customizing circuit breaker
    const customCircuitBreakerConfig = {
      timeout: 2000, // ms
      errorThresholdPercentage: 40,
      resetTimeout: 3000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      volumeThreshold: 2,
    };
    // Instantiate a new HttpClient with the custom configuration
    const customHttpClient = new HttpClient({
      circuitBreaker: customCircuitBreakerConfig,
    });
    try {
      const res = await customHttpClient.get('https://httpbin.org/get');
      return {
        success: true,
        timestamp: new Date().toISOString(),
        path,
        data: res?.data || res,
        meta: {
          durationMs: Date.now() - start,
          usedCustomCircuitBreaker: true,
        },
        errors,
      };
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        timestamp: new Date().toISOString(),
        path,
        data: {},
        meta: {
          durationMs: Date.now() - start,
          usedCustomCircuitBreaker: true,
        },
        errors,
      };
    }
  }
}
