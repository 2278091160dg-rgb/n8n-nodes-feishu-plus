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
		description: 'Feishu/Lark Bitable operations with retry, circuit breaker and test coverage',
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
					{ name: 'Bitable', value: 'bitable' },
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
					{ name: 'Batch Create Records', value: 'batchCreate', action: 'Batch create records' },
					{ name: 'Batch Delete Records', value: 'batchDelete', action: 'Batch delete records' },
					{ name: 'Batch Update Records', value: 'batchUpdate', action: 'Batch update records' },
					{ name: 'Create Record', value: 'createRecord', action: 'Create a record' },
					{ name: 'Delete Record', value: 'deleteRecord', action: 'Delete a record' },
					{ name: 'Get Record', value: 'getRecord', action: 'Get a record' },
					{ name: 'List Fields', value: 'listFields', action: 'List fields' },
					{ name: 'List Records', value: 'listRecords', action: 'List records' },
					{ name: 'List Tables', value: 'listTables', action: 'List tables' },
					{ name: 'Search Records', value: 'searchRecords', action: 'Search records' },
					{ name: 'Update Record', value: 'updateRecord', action: 'Update a record' },
				],
				default: 'getRecord',
			},
			// === Common parameters: app_token + table_id ===
			{
				displayName: 'App Token',
				name: 'appToken',
				type: 'string',
				required: true,
				default: '',
				description: 'The unique identifier of the Bitable app',
				displayOptions: { show: { resource: ['bitable'] } },
			},
			{
				displayName: 'Table ID',
				name: 'tableId',
				type: 'string',
				required: true,
				default: '',
				description: 'The unique identifier of the table',
				displayOptions: {
					show: { resource: ['bitable'] },
					hide: { operation: ['listTables'] },
				},
			},
			// === Record ID (single record ops) ===
			{
				displayName: 'Record ID',
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
				displayName: 'Fields (JSON)',
				name: 'fields',
				type: 'json',
				required: true,
				default: '{}',
				description: 'Record fields as JSON object. Example: {"Name": "test", "Status": "Active"}',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['createRecord', 'updateRecord'] },
				},
			},
			// === Records JSON (batch ops) ===
			{
				displayName: 'Records (JSON)',
				name: 'records',
				type: 'json',
				required: true,
				default: '[]',
				description: 'Array of record objects. batchCreate: [{fields:{...}}], batchUpdate: [{record_id:"x",fields:{...}}], batchDelete: ["recId1","recId2"]. Max 500 per request.',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['batchCreate', 'batchUpdate', 'batchDelete'] },
				},
			},
			// === Search filter ===
			{
				displayName: 'Filter (JSON)',
				name: 'filter',
				type: 'json',
				default: '',
				description: 'Search filter JSON. Example: {"conjunction":"and","conditions":[{"field_name":"Status","operator":"is","value":["Active"]}]}',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['searchRecords'] },
				},
			},
			// === Return All (list/search) ===
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['listRecords', 'searchRecords', 'listTables', 'listFields'] },
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 500 },
				description: 'Max number of results to return',
				displayOptions: {
					show: { resource: ['bitable'], operation: ['listRecords', 'searchRecords', 'listTables', 'listFields'], returnAll: [false] },
				},
			},
			// === Additional Options ===
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['bitable'] } },
				options: [
					{
						displayName: 'User ID Type',
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
						displayName: 'Simplify Output',
						name: 'simplify',
						type: 'boolean',
						default: true,
						description: 'Whether to return a simplified version of the response (record_id + fields only)',
					},
					{
						displayName: 'Automatic Fields',
						name: 'automaticFields',
						type: 'boolean',
						default: false,
						description: 'Whether to include auto-generated fields (created_time, modified_time, etc.)',
					},
					{
						displayName: 'Field Names',
						name: 'fieldNames',
						type: 'string',
						default: '',
						description: 'Comma-separated list of field names to return. Leave empty for all fields.',
					},
					{
						displayName: 'Sort (JSON)',
						name: 'sort',
						type: 'json',
						default: '',
						description: 'Sort conditions for search. Example: [{"field_name":"Created","desc":true}]',
					},
					{
						displayName: 'View ID',
						name: 'viewId',
						type: 'string',
						default: '',
						description: 'Filter records by a specific view',
					},
					{
						displayName: 'Filter (Formula)',
						name: 'filterFormula',
						type: 'string',
						default: '',
						description: 'Filter formula for listRecords. Example: AND(CurrentValue.[Status]="Active")',
					},
					{
						displayName: 'Text Field As Array',
						name: 'textFieldAsArray',
						type: 'boolean',
						default: false,
						description: 'Whether to return text fields as rich text arrays instead of plain strings',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		return router.call(this);
	}
}