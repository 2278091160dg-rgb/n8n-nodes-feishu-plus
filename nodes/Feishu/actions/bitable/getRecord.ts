import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { feishuRequest } from '../../../../transport/request';
import { simplifyRecord } from '../../../../transport/response';

export async function executeGetRecord(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const appToken = this.getNodeParameter('appToken', index) as string;
	const tableId = this.getNodeParameter('tableId', index) as string;
	const recordId = this.getNodeParameter('recordId', index) as string;
	const options = this.getNodeParameter('options', index, {}) as any;

	const qs: Record<string, string | boolean> = {};
	if (options.userIdType) qs.user_id_type = options.userIdType;
	if (options.textFieldAsArray) qs.text_field_as_array = true;
	if (options.automaticFields) qs.with_shared_url = true;

	const data = await feishuRequest.call(this, {
		method: 'GET',
		endpoint: `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`,
		qs,
	});

	const record = data?.record ?? data;
	const result = options.simplify !== false ? simplifyRecord(record) : record;

	return [{ json: result, pairedItem: { item: index } }];
}
