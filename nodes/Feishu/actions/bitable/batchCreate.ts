import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { feishuRequest } from '../../../../transport/request';
import { simplifyRecords } from '../../../../transport/response';

export async function executeBatchCreate(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const appToken = this.getNodeParameter('appToken', index) as string;
	const tableId = this.getNodeParameter('tableId', index) as string;
	const records = this.getNodeParameter('records', index) as any;
	const options = this.getNodeParameter('options', index, {}) as any;

	const recordsArray = typeof records === 'string' ? JSON.parse(records) : records;

	if (!Array.isArray(recordsArray) || recordsArray.length === 0) {
		throw new Error('Records must be a non-empty array');
	}

	if (recordsArray.length > 500) {
		throw new Error('Batch create supports max 500 records per request');
	}

	const qs: Record<string, string> = {};
	if (options.userIdType) qs.user_id_type = options.userIdType;

	const data = await feishuRequest.call(this, {
		method: 'POST',
		endpoint: `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/batch_create`,
		body: { records: recordsArray },
		qs,
	});

	const items = data?.records || [];
	const finalRecords = options.simplify !== false ? simplifyRecords(items) : items;
	return finalRecords.map((record: any) => ({
		json: record,
		pairedItem: { item: index },
	}));
}
