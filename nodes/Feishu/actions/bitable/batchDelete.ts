import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { feishuRequest } from '../../../../transport/request';

export async function executeBatchDelete(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const appToken = this.getNodeParameter('appToken', index) as string;
	const tableId = this.getNodeParameter('tableId', index) as string;
	const records = this.getNodeParameter('records', index) as any;

	const recordIds = typeof records === 'string' ? JSON.parse(records) : records;

	if (recordIds.length > 500) {
		throw new Error('Batch delete supports max 500 records per request');
	}

	await feishuRequest.call(this, {
		method: 'POST',
		endpoint: `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/batch_delete`,
		body: { records: recordIds },
	});

	return [{ json: { success: true, deleted: recordIds.length }, pairedItem: { item: index } }];
}
