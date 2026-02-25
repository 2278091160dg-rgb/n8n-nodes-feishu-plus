import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { feishuRequest } from '../../../../transport/request';

export async function executeDeleteRecord(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const appToken = this.getNodeParameter('appToken', index) as string;
	const tableId = this.getNodeParameter('tableId', index) as string;
	const recordId = this.getNodeParameter('recordId', index) as string;

	await feishuRequest.call(this, {
		method: 'DELETE',
		endpoint: `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
	});

	return [{ json: { success: true, deleted: true, record_id: recordId }, pairedItem: { item: index } }];
}
