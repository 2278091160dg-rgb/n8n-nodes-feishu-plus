import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FeishuPlusApi implements ICredentialType {
	name = 'feishuPlusApi';
	displayName = '飞书 Plus API / Feishu Plus API';
	documentationUrl = 'https://open.feishu.cn/document/server-docs/api-call-guide/calling-process';

	properties: INodeProperties[] = [
		{
			displayName: '接口地址 / Base URL',
			name: 'url',
			type: 'options',
			options: [
				{ name: '飞书 (中国) / Feishu (China)', value: 'https://open.feishu.cn' },
				{ name: 'Lark (国际) / Lark (Global)', value: 'https://open.larksuite.com' },
				{ name: '自定义 / Custom', value: 'custom' },
			],
			default: 'https://open.feishu.cn',
			required: true,
		},
		{
			displayName: '自定义地址 / Custom URL',
			name: 'customUrl',
			type: 'string',
			default: '',
			placeholder: 'https://your-feishu-proxy.example.com',
			displayOptions: {
				show: {
					url: ['custom'],
				},
			},
		},
		{
			displayName: '应用 ID / App ID',
			name: 'appId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: '应用密钥 / App Secret',
			name: 'appSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: '访问令牌 / Access Token',
			name: 'accessToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
	];

	async preAuthentication(this: any, credentials: any): Promise<any> {
		const baseUrl =
			credentials.url === 'custom' ? credentials.customUrl : credentials.url;
		const response = await this.helpers.httpRequest({
			method: 'POST',
			url: `${baseUrl}/open-apis/auth/v3/tenant_access_token/internal`,
			headers: { 'Content-Type': 'application/json' },
			body: {
				app_id: credentials.appId,
				app_secret: credentials.appSecret,
			},
		});
		if (response.code !== 0) {
			throw new Error(`Feishu auth failed: ${response.msg}`);
		}
		return { accessToken: response.tenant_access_token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.url === "custom" ? $credentials.customUrl : $credentials.url}}',
			url: '/open-apis/auth/v3/tenant_access_token/internal',
			method: 'POST',
			body: {
				app_id: '={{$credentials.appId}}',
				app_secret: '={{$credentials.appSecret}}',
			},
			headers: {
				'Content-Type': 'application/json',
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'code',
					value: 0,
					message: 'Invalid App ID or App Secret. Please check your Feishu credentials.',
				},
			},
		],
	};
}