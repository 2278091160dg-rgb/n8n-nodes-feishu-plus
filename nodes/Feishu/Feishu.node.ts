import { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { router } from './actions/router';

export class Feishu implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Feishu Plus',
		name: 'feishuPlus',
		icon: 'file:feishu.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: '飞书多维表格操作，支持重试、熔断和完整测试覆盖',
		defaults: { name: 'Feishu Plus' },
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [{ name: 'feishuPlusApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: '多维表格', value: 'bitable' },
				],
				default: 'bitable',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['bitable'] } },
				options: [
					{ name: '批量创建记录', value: 'batchCreate', action: '批量创建记录' },
					{ name: '批量删除记录', value: 'batchDelete', action: '批量删除记录' },
					{ name: '批量更新记录', value: 'batchUpdate', action: '批量更新记录' },
					{ name: '创建记录', value: 'createRecord', action: '创建记录' },
					{ name: '删除记录', value: 'deleteRecord', action: '删除记录' },
					{ name: '获取记录', value: 'getRecord', action: '获取记录' },
					{ name: '列出字段', value: 'listFields', action: '列出字段' },
					{ name: '列出记录', value: 'listRecords', action: '列出记录' },
					{ name: '列出数据表', value: 'listTables', action: '列出数据表' },
					{ name: '搜索记录', value: 'searchRecords', action: '搜索记录' },
					{ name: '更新记录', value: 'updateRecord', action: '更新记录' },
				],
				default: 'getRecord',
			},
			// === Common parameters: app_token + table_id ===
			{
				displayName: '应用 Token',
				name: 'appToken',
				type: 'string',
				required: true,
				default: '',
				description: '多维表格应用的唯一标识符',
				displayOptions: { show: { resource: ['bitable'] } },
			},
			{
				displayName: '数据表 ID',
				name: 'tableId',
				type: 'string',
				required: true,
				default: '',
				description: '数据表的唯一标识符',
				displayOptions: {
					show: { resource: ['bitable'] },
					hide: { operation: ['listTables'] },
				},
			},
			// === Record ID (single record ops) ===
			{
				displayName: '记录 ID',
				name: 'recordId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['getRecord', 'updateRecord', 'deleteRecord'] },
				},
			},
			// === Fields JSON (create/update) ===
			{
				displayName: '字段 (JSON)',
				name: 'fields',
				type: 'json',
				required: true,
				default: '{}',
				description: '记录字段的 JSON 对象。示例：{"Name": "test", "Status": "Active"}',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['createRecord', 'updateRecord'] },
				},
			},
			// === Records JSON (batch ops) ===
			{
				displayName: '记录列表 (JSON)',
				name: 'records',
				type: 'json',
				required: true,
				default: '[]',
				description: '记录对象数组。批量创建：[{fields:{...}}]，批量更新：[{record_id:"x",fields:{...}}]，批量删除：["recId1","recId2"]。每次最多 500 条。',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['batchCreate', 'batchUpdate', 'batchDelete'] },
				},
			},
			// === Search filter ===
			{
				displayName: '筛选条件 (JSON)',
				name: 'filter',
				type: 'json',
				default: '',
				description: '搜索筛选条件 JSON。示例：{"conjunction":"and","conditions":[{"field_name":"Status","operator":"is","value":["Active"]}]}',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['searchRecords'] },
				},
			},
			// === Return All (list/search) ===
			{
				displayName: '返回全部',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: '是否返回所有结果，还是只返回指定数量',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['listRecords', 'searchRecords', 'listTables', 'listFields'] },
				},
			},
			{
				displayName: '数量限制',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 500 },
				description: '返回结果的最大数量',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['listRecords', 'searchRecords', 'listTables', 'listFields'], returnAll: [false] },
				},
			},
			// === Additional Options ===
			{
				displayName: '选项',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项',
				default: {},
				displayOptions: { show: { resource: ['bitable'] } },
				options: [
					{
						displayName: '用户 ID 类型',
						name: 'userIdType',
						type: 'options',
						options: [
							{ name: 'Open ID', value: 'open_id' },
							{ name: 'Union ID', value: 'union_id' },
							{ name: 'User ID', value: 'user_id' },
						],
						default: 'open_id',
					},
					{
						displayName: '简化输出',
						name: 'simplify',
						type: 'boolean',
						default: true,
						description: '是否返回简化版本的响应（仅 record_id + fields）',
					},
					{
						displayName: '自动字段',
						name: 'automaticFields',
						type: 'boolean',
						default: false,
						description: '是否包含自动生成的字段（created_time、modified_time 等）',
					},
					{
						displayName: '字段名称',
						name: 'fieldNames',
						type: 'string',
						default: '',
						description: '要返回的字段名称，用逗号分隔。留空返回所有字段。',
					},
					{
						displayName: '排序 (JSON)',
						name: 'sort',
						type: 'json',
						default: '',
						description: '搜索排序条件。示例：[{"field_name":"Created","desc":true}]',
					},
					{
						displayName: '视图 ID',
						name: 'viewId',
						type: 'string',
						default: '',
						description: '按指定视图筛选记录',
					},
					{
						displayName: '筛选公式',
						name: 'filterFormula',
						type: 'string',
						default: '',
						description: '列出记录的筛选公式。示例：AND(CurrentValue.[Status]="Active")',
					},
					{
						displayName: '文本字段返回数组',
						name: 'textFieldAsArray',
						type: 'boolean',
						default: false,
						description: '是否将文本字段作为富文本数组返回，而非纯文本字符串',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		return router.call(this);
	}
}