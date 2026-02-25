import {
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	NodeApiError,
} from 'n8n-workflow';
import { sanitizeError, FeishuApiError } from './error';
import { parseFeishuResponse } from './response';

export interface FeishuRequestOptions {
	method: IHttpRequestMethods;
	endpoint: string;
	body?: object;
	qs?: Record<string, string | number | boolean>;
	timeout?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 1000, 2000];
const RETRYABLE_HTTP_CODES = [429, 500, 502, 503, 504];
const RETRYABLE_FEISHU_CODES = [1254040];
const TOKEN_EXPIRED_CODES = [99991663, 99991668];

let circuitBreakerFailures = 0;
let circuitBreakerOpenUntil = 0;
const CIRCUIT_BREAKER_THRESHOLD = 10;
const CIRCUIT_BREAKER_RESET_MS = 60000;

export function resetCircuitBreaker(): void {
	circuitBreakerFailures = 0;
	circuitBreakerOpenUntil = 0;
}

export function getCircuitBreakerState(): { failures: number; openUntil: number } {
	return { failures: circuitBreakerFailures, openUntil: circuitBreakerOpenUntil };
}

export function setCircuitBreakerState(failures: number, openUntil: number): void {
	circuitBreakerFailures = failures;
	circuitBreakerOpenUntil = openUntil;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function feishuRequest(
	this: IExecuteFunctions,
	options: FeishuRequestOptions,
): Promise<any> {
	const credentials = await this.getCredentials('feishuPlusApi');
	const baseUrl =
		credentials.url === 'custom'
			? (credentials.customUrl as string)
			: (credentials.url as string);
	const appSecret = credentials.appSecret as string;
	const accessToken = credentials.accessToken as string;

	if (circuitBreakerFailures >= CIRCUIT_BREAKER_THRESHOLD) {
		if (Date.now() < circuitBreakerOpenUntil) {
			throw new NodeApiError(this.getNode(), {
				message: 'Circuit breaker is open. Too many consecutive failures.',
				description: `Service will retry after ${Math.ceil((circuitBreakerOpenUntil - Date.now()) / 1000)}s`,
			});
		}
		circuitBreakerFailures = 0;
	}

	const requestOptions: IHttpRequestOptions = {
		method: options.method,
		url: `${baseUrl}${options.endpoint}`,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
		body: options.body,
		qs: options.qs as any,
		timeout: options.timeout || 30000,
	};

	let lastError: any;
	let tokenRefreshed = false;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			const rawResponse = await this.helpers.httpRequest(requestOptions);
			const data = parseFeishuResponse(rawResponse);
			circuitBreakerFailures = 0;
			return data;
		} catch (error: any) {
			lastError = error;
			const httpCode = error.statusCode || error.httpCode || 0;
			const feishuCode = error instanceof FeishuApiError ? error.feishuCode : undefined;

			// Token expired — clear token and retry once (no recursion)
			if (feishuCode && TOKEN_EXPIRED_CODES.includes(feishuCode) && !tokenRefreshed) {
				tokenRefreshed = true;
				// Force n8n to re-run preAuthentication by getting fresh credentials
				const freshCreds = await this.getCredentials('feishuPlusApi');
				requestOptions.headers = {
					...requestOptions.headers,
					Authorization: `Bearer ${freshCreds.accessToken as string}`,
				};
				continue;
			}

			// Non-retryable 4xx (except 429)
			if (httpCode >= 400 && httpCode < 500 && httpCode !== 429) {
				circuitBreakerFailures++;
				if (circuitBreakerFailures >= CIRCUIT_BREAKER_THRESHOLD) {
					circuitBreakerOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
				}
				throw sanitizeError(this, error, appSecret, accessToken);
			}

			// Retryable HTTP or Feishu codes
			const isRetryableHttp = RETRYABLE_HTTP_CODES.includes(httpCode);
			const isRetryableFeishu = feishuCode !== undefined && RETRYABLE_FEISHU_CODES.includes(feishuCode);

			if ((isRetryableHttp || isRetryableFeishu) && attempt < MAX_RETRIES) {
				await sleep(RETRY_DELAYS[attempt] || 2000);
				continue;
			}
		}
	}

	circuitBreakerFailures++;
	if (circuitBreakerFailures >= CIRCUIT_BREAKER_THRESHOLD) {
		circuitBreakerOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
	}
	throw sanitizeError(this, lastError, appSecret, accessToken);
}
