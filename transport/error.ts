import { IExecuteFunctions, NodeApiError } from 'n8n-workflow';

export class FeishuApiError extends Error {
	public readonly feishuCode: number;

	constructor(message: string, feishuCode: number) {
		super(message);
		this.name = 'FeishuApiError';
		this.feishuCode = feishuCode;
	}
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const FEISHU_ERROR_MESSAGES: Record<number, string> = {
	99991663: 'Token expired: will refresh and retry',
	99991668: 'Token invalid: please re-authenticate',
	1254000: 'Bad Request: please check your input parameters',
	1254001: 'Permission denied: please check app permissions for this Bitable',
	1254003: 'Record not found',
	1254004: 'Table not found',
	1254040: 'Rate limited: request frequency exceeded',
	1254100: 'Batch operation limit exceeded: max 500 records per request',
};

const HTTP_ERROR_MESSAGES: Record<number, string> = {
	400: 'Bad Request: please check your input parameters',
	401: 'Unauthorized: invalid credentials',
	403: 'Forbidden: insufficient permissions',
	404: 'Not Found: the requested resource does not exist',
	429: 'Rate Limited: too many requests, please try again later',
	500: 'Internal Server Error: Feishu service error',
	502: 'Bad Gateway: Feishu service temporarily unavailable',
	503: 'Service Unavailable: Feishu is under maintenance',
	504: 'Gateway Timeout: Feishu service did not respond in time',
};

export function sanitizeError(
	context: IExecuteFunctions,
	error: any,
	appSecret: string,
	accessToken: string,
): NodeApiError {
	let message = error.message || 'Unknown error';
	let description = error.description || '';

	// Also sanitize any stringified request body that might contain secrets
	if (error.options?.body) {
		try {
			const bodyStr = typeof error.options.body === 'string'
				? error.options.body
				: JSON.stringify(error.options.body);
			if (bodyStr.includes(appSecret) || bodyStr.includes(accessToken)) {
				delete error.options.body;
			}
		} catch (_e) {
			// Ignore serialization errors
		}
	}

	const sensitiveValues = [appSecret, accessToken].filter(Boolean);
	for (const val of sensitiveValues) {
		const masked = val.substring(0, 4) + '****';
		const regex = new RegExp(escapeRegex(val), 'g');
		message = message.replace(regex, masked);
		description = description.replace(regex, masked);
	}

	const feishuCode = error instanceof FeishuApiError ? error.feishuCode : (error.feishuCode as number | undefined);
	const httpCode = error.statusCode || error.httpCode || 0;

	let friendlyMessage = message;
	if (feishuCode && FEISHU_ERROR_MESSAGES[feishuCode]) {
		friendlyMessage = FEISHU_ERROR_MESSAGES[feishuCode];
	} else if (httpCode && HTTP_ERROR_MESSAGES[httpCode]) {
		friendlyMessage = HTTP_ERROR_MESSAGES[httpCode];
	}

	return new NodeApiError(context.getNode(), {
		message: friendlyMessage,
		description,
		httpCode: String(httpCode),
	});
}

export { FEISHU_ERROR_MESSAGES, HTTP_ERROR_MESSAGES };