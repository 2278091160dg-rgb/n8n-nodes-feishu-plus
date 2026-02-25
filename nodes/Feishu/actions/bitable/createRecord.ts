import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { feishuRequest } from '../../../../transport/request';
import { simplifyRecord } from '../../../../transport/response';

export async function executeCreateRecord(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const appToken = this.getNodeParameter('appToken', index) as string;
	const tableId = this.getNodeParameter('tableId', index) as string;
	const fields = this.getNodeParameter('fields', index) as object;
	const options = this.getNodeParameter('options', index, {}) as any;

	const qs: Record<string, string> = {};
	if (options.userIdType) qs.user_id_type = options.userIdType;

	const data = await feishuRequest.call(this, {
		method: 'POST',
		endpoint: `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
		body: { fields },
		qs,
	});

	const record = data?.record ?? data;
	const result = options.simplify !== false ? simplifyRecord(record) : record;

	return [{ json: result, pairedItem: { item: index } }];
}
