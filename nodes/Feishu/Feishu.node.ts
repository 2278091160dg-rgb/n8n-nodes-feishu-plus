import { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { router } from './actions/router';

export class Feishu implements INodeType {
	description: INodeTypeDescription = {
		displayName: '飞书 Plus / Feishu Plus',
		name: 'feishuPlus',
		icon: 'file:feishu.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: '飞书多维表格操作 Feishu Bitable operations with retry, circuit-breaker & full test coverage',
		defaults: { name: 'Feishu Plus' },
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [{ name: 'feishuPlusApi', required: true }],
		properties: [
			{
				displayName: '资源 / Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: '多维表格 / Bitable', value: 'bitable' },
				],
				default: 'bitable',
			},
			{
				displayName: '操作 / Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['bitable'] } },
				options: [
					{ name: '批量创建记录 / Batch Create', value: 'batchCreate', action: '批量创建记录 / Batch Create' },
					{ name: '批量删除记录 / Batch Delete', value: 'batchDelete', action: '批量删除记录 / Batch Delete' },
					{ name: '批量更新记录 / Batch Update', value: 'batchUpdate', action: '批量更新记录 / Batch Update' },
					{ name: '创建记录 / Create Record', value: 'createRecord', action: '创建记录 / Create Record' },
					{ name: '删除记录 / Delete Record', value: 'deleteRecord', action: '删除记录 / Delete Record' },
					{ name: '获取记录 / Get Record', value: 'getRecord', action: '获取记录 / Get Record' },
					{ name: '列出字段 / List Fields', value: 'listFields', action: '列出字段 / List Fields' },
					{ name: '列出记录 / List Records', value: 'listRecords', action: '列出记录 / List Records' },
					{ name: '列出数据表 / List Tables', value: 'listTables', action: '列出数据表 / List Tables' },
					{ name: '搜索记录 / Search Records', value: 'searchRecords', action: '搜索记录 / Search Records' },
					{ name: '更新记录 / Update Record', value: 'updateRecord', action: '更新记录 / Update Record' },
				],
				default: 'getRecord',
			},
			// === Common parameters: app_token + table_id ===
			{
				displayName: '应用 Token / App Token',
				name: 'appToken',
				type: 'string',
				required: true,
				default: '',
				description: '多维表格应用的唯一标识符 Unique identifier of the Bitable app',
				displayOptions: { show: { resource: ['bitable'] } },
			},
			{
				displayName: '数据表 ID / Table ID',
				name: 'tableId',
				type: 'string',
				required: true,
				default: '',
				description: '数据表的唯一标识符 Unique identifier of the table',
				displayOptions: {
					show: { resource: ['bitable'] },
					hide: { operation: ['listTables'] },
				},
			},
			// === Record ID (single record ops) ===
			{
				displayName: '记录 ID / Record ID',
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
				displayName: '字段 (JSON) / Fields (JSON)',
				name: 'fields',
				type: 'json',
				required: true,
				default: '{}',
				description: '记录字段的 JSON 对象 JSON object of record fields. Example: {"Name": "test", "Status": "Active"}',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['createRecord', 'updateRecord'] },
				},
			},
			// === Records JSON (batch ops) ===
			{
				displayName: '记录列表 (JSON) / Records (JSON)',
				name: 'records',
				type: 'json',
				required: true,
				default: '[]',
				description: '记录对象数组 Array of record objects. Batch create: [{fields:{...}}], batch update: [{record_id:"x",fields:{...}}], batch delete: ["recId1","recId2"]. Max 500 per call.',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['batchCreate', 'batchUpdate', 'batchDelete'] },
				},
			},
			// === Search filter ===
			{
				displayName: '筛选条件 (JSON) / Filter (JSON)',
				name: 'filter',
				type: 'json',
				default: '',
				description: '搜索筛选条件 JSON Search filter JSON. Example: {"conjunction":"and","conditions":[{"field_name":"Status","operator":"is","value":["Active"]}]}',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['searchRecords'] },
				},
			},
			// === Return All (list/search) ===
			{
				displayName: '返回全部 / Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: '是否返回所有结果 Whether to return all results or only up to a given limit',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['listRecords', 'searchRecords', 'listTables', 'listFields'] },
				},
			},
			{
				displayName: '数量限制 / Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 500 },
				description: '返回结果的最大数量 Maximum number of results to return',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['listRecords', 'searchRecords', 'listTables', 'listFields'], returnAll: [false] },
				},
			},
			// === Additional Options ===
			{
				displayName: '选项 / Options',
				name: 'options',
				type: 'collection',
				placeholder: '添加选项 / Add Option',
				default: {},
				displayOptions: { show: { resource: ['bitable'] } },
				options: [
					{
						displayName: '用户 ID 类型 / User ID Type',
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
						displayName: '简化输出 / Simplify Output',
						name: 'simplify',
						type: 'boolean',
						default: true,
						description: '是否返回简化版本的响应 Whether to return simplified response (record_id + fields only)',
					},
					{
						displayName: '自动字段 / Auto Fields',
						name: 'automaticFields',
						type: 'boolean',
						default: false,
						description: '是否包含自动生成的字段 Whether to include auto-generated fields (created_time, modified_time, etc.)',
					},
					{
						displayName: '字段名称 / Field Names',
						name: 'fieldNames',
						type: 'string',
						default: '',
						description: '要返回的字段名称，逗号分隔 Field names to return, comma-separated. Leave empty for all.',
					},
					{
						displayName: '排序 (JSON) / Sort (JSON)',
						name: 'sort',
						type: 'json',
						default: '',
						description: '搜索排序条件 Sort conditions. Example: [{"field_name":"Created","desc":true}]',
					},
					{
						displayName: '视图 ID / View ID',
						name: 'viewId',
						type: 'string',
						default: '',
						description: '按指定视图筛选记录 Filter records by a specific view',
					},
					{
						displayName: '筛选公式 / Filter Formula',
						name: 'filterFormula',
						type: 'string',
						default: '',
						description: '列出记录的筛选公式 Filter formula for listing records. Example: AND(CurrentValue.[Status]="Active")',
					},
					{
						displayName: '文本字段返回数组 / Text as Array',
						name: 'textFieldAsArray',
						type: 'boolean',
						default: false,
						description: '是否将文本字段作为富文本数组返回 Whether to return text fields as rich-text arrays instead of plain strings',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		return router.call(this);
	}
}