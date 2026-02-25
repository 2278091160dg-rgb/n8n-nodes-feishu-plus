import { sanitizeError } from '../../../transport/error';

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

describe('sanitizeError', () => {
	const mockContext: any = {
		getNode: jest.fn().mockReturnValue({ name: 'Feishu Plus', type: 'feishuPlus' }),
	};

	it('should mask appSecret in error message', () => {
		const error = { message: 'Auth failed with secret abc123secret456' };
		const result = sanitizeError(mockContext, error, 'abc123secret456', '');

		expect(result.message).not.toContain('abc123secret456');
		expect(result.message).toContain('abc1****');
	});

	it('should mask accessToken in error message', () => {
		const error = { message: 'Token t-abcdef123456 is invalid' };
		const result = sanitizeError(mockContext, error, '', 't-abcdef123456');

		expect(result.message).not.toContain('t-abcdef123456');
		expect(result.message).toContain('t-ab****');
	});

	it('should mask both appSecret and accessToken', () => {
		const error = {
			message: 'secret=mysecret123 token=t-mytoken456',
			description: 'Details: mysecret123 and t-mytoken456',
		};
		const result = sanitizeError(mockContext, error, 'mysecret123', 't-mytoken456');

		expect(result.message).not.toContain('mysecret123');
		expect(result.message).not.toContain('t-mytoken456');
	});

	it('should use feishu error message for known feishu codes', () => {
		const error = { message: 'some error', feishuCode: 1254001 };
		const result = sanitizeError(mockContext, error, '', '');

		expect(result.message).toContain('Permission denied');
	});

	it('should use HTTP error message for known HTTP codes', () => {
		const error = { message: 'error', statusCode: 429 };
		const result = sanitizeError(mockContext, error, '', '');

		expect(result.message).toContain('Rate Limited');
	});

	it('should fall back to original message for unknown codes', () => {
		const error = { message: 'Something weird happened' };
		const result = sanitizeError(mockContext, error, '', '');

		expect(result.message).toBe('Something weird happened');
	});

	it('should handle missing message gracefully', () => {
		const error = {};
		const result = sanitizeError(mockContext, error, '', '');

		expect(result.message).toBe('Unknown error');
	});

	it('should set httpCode on the error', () => {
		const error = { message: 'err', statusCode: 502 };
		const result = sanitizeError(mockContext, error, '', '');

		expect(result.httpCode).toBe('502');
	});

	it('should handle regex special characters in secrets', () => {
		const error = { message: 'secret is abc+def.ghi' };
		const result = sanitizeError(mockContext, error, 'abc+def.ghi', '');

		expect(result.message).not.toContain('abc+def.ghi');
	});

	it('should skip masking for empty sensitive values', () => {
		const error = { message: 'plain error message' };
		const result = sanitizeError(mockContext, error, '', '');

		expect(result.message).toBe('plain error message');
	});
});
