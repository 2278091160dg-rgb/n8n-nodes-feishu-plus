import { FeishuPlusApi } from '../../../credentials/FeishuPlusApi.credentials';

describe('FeishuPlusApi Credentials', () => {
	let credentials: FeishuPlusApi;

	beforeEach(() => {
		credentials = new FeishuPlusApi();
	});

	it('should have correct name', () => {
		expect(credentials.name).toBe('feishuPlusApi');
	});

	it('should have correct display name', () => {
		expect(credentials.displayName).toBe('飞书 Plus API / Feishu Plus API');
	});

	it('should have documentation URL', () => {
		expect(credentials.documentationUrl).toBeDefined();
	});

	it('should have url options property with China/Global/Custom', () => {
		const urlProp = credentials.properties.find((p) => p.name === 'url');
		expect(urlProp).toBeDefined();
		expect(urlProp!.type).toBe('options');
		expect((urlProp as any).options).toHaveLength(3);
		expect((urlProp as any).options[0].value).toBe('https://open.feishu.cn');
		expect((urlProp as any).options[1].value).toBe('https://open.larksuite.com');
		expect((urlProp as any).options[2].value).toBe('custom');
	});

	it('should have customUrl property shown only for custom', () => {
		const customUrlProp = credentials.properties.find((p) => p.name === 'customUrl');
		expect(customUrlProp).toBeDefined();
		expect(customUrlProp!.type).toBe('string');
		expect((customUrlProp as any).displayOptions.show.url).toEqual(['custom']);
	});

	it('should have appId property', () => {
		const appIdProp = credentials.properties.find((p) => p.name === 'appId');
		expect(appIdProp).toBeDefined();
		expect(appIdProp!.type).toBe('string');
		expect(appIdProp!.required).toBe(true);
	});

	it('should have appSecret property with password type', () => {
		const appSecretProp = credentials.properties.find((p) => p.name === 'appSecret');
		expect(appSecretProp).toBeDefined();
		expect(appSecretProp!.type).toBe('string');
		expect(appSecretProp!.typeOptions).toEqual({ password: true });
		expect(appSecretProp!.required).toBe(true);
	});

	it('should have accessToken property marked as expirable', () => {
		const tokenProp = credentials.properties.find((p) => p.name === 'accessToken');
		expect(tokenProp).toBeDefined();
		expect(tokenProp!.type).toBe('hidden');
		expect(tokenProp!.typeOptions).toEqual({ expirable: true });
	});

	it('should have exactly 5 properties', () => {
		expect(credentials.properties).toHaveLength(5);
	});

	it('should have authenticate config with Bearer token', () => {
		expect(credentials.authenticate).toEqual({
			type: 'generic',
			properties: {
				headers: {
					Authorization: '=Bearer {{$credentials.accessToken}}',
				},
			},
		});
	});

	it('should have test request config', () => {
		expect(credentials.test).toBeDefined();
		expect((credentials.test as any).request.url).toContain('/open-apis/auth/v3/tenant_access_token/internal');
		expect((credentials.test as any).request.method).toBe('POST');
	});

	describe('preAuthentication', () => {
		it('should call tenant_access_token endpoint for China URL', async () => {
			const mockHttpRequest = jest.fn().mockResolvedValue({
				code: 0,
				msg: 'ok',
				tenant_access_token: 't-test-token-123',
				expire: 7200,
			});
			const mockThis = { helpers: { httpRequest: mockHttpRequest } };

			const result = await credentials.preAuthentication.call(mockThis as any, {
				url: 'https://open.feishu.cn',
				customUrl: '',
				appId: 'cli_test123',
				appSecret: 'secret123',
				accessToken: '',
			});

			expect(result).toEqual({ accessToken: 't-test-token-123' });
			expect(mockHttpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
					body: { app_id: 'cli_test123', app_secret: 'secret123' },
				}),
			);
		});

		it('should use custom URL when url is "custom"', async () => {
			const mockHttpRequest = jest.fn().mockResolvedValue({
				code: 0,
				msg: 'ok',
				tenant_access_token: 't-custom-token',
				expire: 7200,
			});
			const mockThis = { helpers: { httpRequest: mockHttpRequest } };

			await credentials.preAuthentication.call(mockThis as any, {
				url: 'custom',
				customUrl: 'https://my-proxy.example.com',
				appId: 'cli_test',
				appSecret: 'secret',
				accessToken: '',
			});

			expect(mockHttpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://my-proxy.example.com/open-apis/auth/v3/tenant_access_token/internal',
				}),
			);
		});

		it('should throw on non-zero code', async () => {
			const mockHttpRequest = jest.fn().mockResolvedValue({
				code: 10003,
				msg: 'invalid app_id',
			});
			const mockThis = { helpers: { httpRequest: mockHttpRequest } };

			await expect(
				credentials.preAuthentication.call(mockThis as any, {
					url: 'https://open.feishu.cn',
					customUrl: '',
					appId: 'bad_id',
					appSecret: 'bad_secret',
					accessToken: '',
				}),
			).rejects.toThrow('Feishu auth failed: invalid app_id');
		});
	});
});
