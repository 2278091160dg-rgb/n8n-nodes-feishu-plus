import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FeishuPlusApi implements ICredentialType {
	name = 'feishuPlusApi';
	displayName = 'Feishu Plus API';
	documentationUrl = 'https://open.feishu.cn/document/server-docs/api-call-guide/calling-process';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'options',
			options: [
				{ name: 'Feishu (China)', value: 'https://open.feishu.cn' },
				{ name: 'Lark (Global)', value: 'https://open.larksuite.com' },
				{ name: 'Custom', value: 'custom' },
			],
			default: 'https://open.feishu.cn',
			required: true,
		},
		{
			displayName: 'Custom URL',
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
			displayName: 'App ID',
			name: 'appId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'App Secret',
			name: 'appSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Access Token',
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
			url: '/open-apis/bitable/v1/apps/empty/tables',
			method: 'GET',
		},
	};
}