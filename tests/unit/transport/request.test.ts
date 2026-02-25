import { feishuRequest, resetCircuitBreaker, getCircuitBreakerState, setCircuitBreakerState } from '../../../transport/request';

jest.mock('n8n-workflow', () => ({
	NodeApiError: class NodeApiError extends Error {
		httpCode: string;
		description: string;
		constructor(node: any, opts: any) {
			super(opts.message);
			this.httpCode = opts.httpCode;
			this.description = opts.description || '';
		}
	},
}));

jest.mock('../../../transport/error', () => {
	class FeishuApiError extends Error {
		feishuCode: number;
		constructor(message: string, feishuCode: number) {
			super(message);
			this.name = 'FeishuApiError';
			this.feishuCode = feishuCode;
		}
	}
	return {
		FeishuApiError,
		sanitizeError: jest.fn((_ctx, error, _secret, _token) => {
			const err = new Error(error.message || 'Sanitized error');
			(err as any).httpCode = String(error.statusCode || error.httpCode || 0);
			return err;
		}),
	};
});

describe('feishuRequest', () => {
	let mockContext: any;
	let mockHttpRequest: jest.Mock;

	beforeEach(() => {
		resetCircuitBreaker();
		mockHttpRequest = jest.fn();
		mockContext = {
			getCredentials: jest.fn().mockResolvedValue({
				url: 'https://open.feishu.cn',
				customUrl: '',
				appId: 'cli_test',
				appSecret: 'test-secret-123',
				accessToken: 't-test-token-456',
			}),
			getNode: jest.fn().mockReturnValue({
				name: 'Feishu Plus',
				type: 'feishuPlus',
			}),
			helpers: {
				httpRequest: mockHttpRequest,
			},
		};
	});

	it('should make a successful request', async () => {
		mockHttpRequest.mockResolvedValue({ code: 0, msg: 'ok', data: { record_id: 'rec1' } });

		const result = await feishuRequest.call(mockContext, {
			method: 'GET',
			endpoint: '/open-apis/bitable/v1/apps/app1/tables/tbl1/records/rec1',
		});

		expect(result).toEqual({ record_id: 'rec1' });
		expect(mockHttpRequest).toHaveBeenCalledTimes(1);
		expect(mockHttpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				url: 'https://open.feishu.cn/open-apis/bitable/v1/apps/app1/tables/tbl1/records/rec1',
				headers: expect.objectContaining({
					Authorization: 'Bearer t-test-token-456',
				}),
			}),
		);
	});

	it('should use custom URL when url is "custom"', async () => {
		mockContext.getCredentials.mockResolvedValue({
			url: 'custom',
			customUrl: 'https://my-proxy.com',
			appSecret: 's',
			accessToken: 't',
		});
		mockHttpRequest.mockResolvedValue({ code: 0, data: {} });

		await feishuRequest.call(mockContext, { method: 'GET', endpoint: '/test' });

		expect(mockHttpRequest).toHaveBeenCalledWith(
			expect.objectContaining({ url: 'https://my-proxy.com/test' }),
		);
	});

	it('should throw on 4xx errors without retry', async () => {
		mockHttpRequest.mockRejectedValue({ message: 'Bad request', statusCode: 400 });

		await expect(
			feishuRequest.call(mockContext, { method: 'POST', endpoint: '/test', body: {} }),
		).rejects.toThrow();

		expect(mockHttpRequest).toHaveBeenCalledTimes(1);
	});

	it('should retry on 429 and succeed', async () => {
		mockHttpRequest
			.mockRejectedValueOnce({ message: 'Rate limited', statusCode: 429 })
			.mockResolvedValue({ code: 0, data: { ok: true } });

		const result = await feishuRequest.call(mockContext, {
			method: 'POST',
			endpoint: '/test',
			body: {},
		});

		expect(result).toEqual({ ok: true });
		expect(mockHttpRequest).toHaveBeenCalledTimes(2);
	});

	it('should retry on 500 errors', async () => {
		mockHttpRequest
			.mockRejectedValueOnce({ message: 'Server error', statusCode: 500 })
			.mockResolvedValue({ code: 0, data: {} });

		await feishuRequest.call(mockContext, { method: 'GET', endpoint: '/test' });
		expect(mockHttpRequest).toHaveBeenCalledTimes(2);
	});

	it('should retry on 502 errors', async () => {
		mockHttpRequest
			.mockRejectedValueOnce({ message: 'Bad gateway', statusCode: 502 })
			.mockResolvedValue({ code: 0, data: {} });

		await feishuRequest.call(mockContext, { method: 'GET', endpoint: '/test' });
		expect(mockHttpRequest).toHaveBeenCalledTimes(2);
	});

	it('should retry on feishu code 1254040 (rate limit)', async () => {
		mockHttpRequest
			.mockResolvedValueOnce({ code: 1254040, msg: 'frequency limit' })
			.mockResolvedValue({ code: 0, data: { ok: true } });

		const result = await feishuRequest.call(mockContext, { method: 'POST', endpoint: '/test', body: {} });
		expect(result).toEqual({ ok: true });
		expect(mockHttpRequest).toHaveBeenCalledTimes(2);
	});

	it('should refresh token on 99991663 and retry once', async () => {
		mockHttpRequest
			.mockResolvedValueOnce({ code: 99991663, msg: 'token expired' })
			.mockResolvedValue({ code: 0, data: { refreshed: true } });

		mockContext.getCredentials
			.mockResolvedValueOnce({
				url: 'https://open.feishu.cn', customUrl: '', appSecret: 's', accessToken: 't-old',
			})
			.mockResolvedValueOnce({
				url: 'https://open.feishu.cn', customUrl: '', appSecret: 's', accessToken: 't-new',
			});

		const result = await feishuRequest.call(mockContext, { method: 'GET', endpoint: '/test' });
		expect(result).toEqual({ refreshed: true });
		expect(mockContext.getCredentials).toHaveBeenCalledTimes(2);
	});

	it('should not retry token refresh more than once', async () => {
		mockHttpRequest
			.mockResolvedValueOnce({ code: 99991663, msg: 'token expired' })
			.mockResolvedValueOnce({ code: 99991663, msg: 'still expired' })
			.mockResolvedValueOnce({ code: 99991663, msg: 'still expired' })
			.mockResolvedValueOnce({ code: 99991663, msg: 'still expired' });

		await expect(
			feishuRequest.call(mockContext, { method: 'GET', endpoint: '/test' }),
		).rejects.toThrow();
	});

	it('should throw circuit breaker error when open', async () => {
		setCircuitBreakerState(10, Date.now() + 60000);

		await expect(
			feishuRequest.call(mockContext, { method: 'GET', endpoint: '/test' }),
		).rejects.toThrow('Circuit breaker is open');

		expect(mockHttpRequest).not.toHaveBeenCalled();
	});

	it('should reset to half-open when circuit breaker timeout expires', async () => {
		setCircuitBreakerState(10, Date.now() - 1000);
		mockHttpRequest.mockResolvedValue({ code: 0, data: { ok: true } });

		const result = await feishuRequest.call(mockContext, { method: 'GET', endpoint: '/test' });
		expect(result).toEqual({ ok: true });
		const state = getCircuitBreakerState();
		expect(state.failures).toBe(0);
	});

	it('should increment circuit breaker on 4xx failure', async () => {
		setCircuitBreakerState(3, 0);
		mockHttpRequest.mockRejectedValue({ message: 'Forbidden', statusCode: 403 });

		try {
			await feishuRequest.call(mockContext, { method: 'GET', endpoint: '/test' });
		} catch (_e) { /* expected */ }

		const state = getCircuitBreakerState();
		expect(state.failures).toBe(4);
	});

	it('should open circuit breaker after threshold failures', async () => {
		setCircuitBreakerState(9, 0);
		mockHttpRequest.mockRejectedValue({ message: 'Bad request', statusCode: 400 });

		try {
			await feishuRequest.call(mockContext, { method: 'POST', endpoint: '/test', body: {} });
		} catch (_e) { /* expected */ }

		const state = getCircuitBreakerState();
		expect(state.failures).toBe(10);
		expect(state.openUntil).toBeGreaterThan(Date.now());
	});

	it('should reset circuit breaker on success', async () => {
		setCircuitBreakerState(3, 0);
		mockHttpRequest.mockResolvedValue({ code: 0, data: {} });

		await feishuRequest.call(mockContext, { method: 'GET', endpoint: '/test' });
		const state = getCircuitBreakerState();
		expect(state.failures).toBe(0);
	});

	it('should exhaust retries and throw', async () => {
		mockHttpRequest.mockRejectedValue({ message: 'Server error', statusCode: 500 });

		await expect(
			feishuRequest.call(mockContext, { method: 'GET', endpoint: '/test' }),
		).rejects.toThrow();

		expect(mockHttpRequest).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
	});

	it('should pass query string parameters', async () => {
		mockHttpRequest.mockResolvedValue({ code: 0, data: {} });

		await feishuRequest.call(mockContext, {
			method: 'GET',
			endpoint: '/test',
			qs: { page_size: 100, user_id_type: 'open_id' },
		});

		expect(mockHttpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				qs: { page_size: 100, user_id_type: 'open_id' },
			}),
		);
	});

	it('should pass request body', async () => {
		mockHttpRequest.mockResolvedValue({ code: 0, data: {} });

		await feishuRequest.call(mockContext, {
			method: 'POST',
			endpoint: '/test',
			body: { fields: { name: 'test' } },
		});

		expect(mockHttpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				body: { fields: { name: 'test' } },
			}),
		);
	});
});
