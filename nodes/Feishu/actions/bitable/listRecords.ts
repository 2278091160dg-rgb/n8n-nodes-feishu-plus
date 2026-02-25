import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { feishuRequest } from '../../../../transport/request';
import { simplifyRecords } from '../../../../transport/response';

export async function executeListRecords(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const appToken = this.getNodeParameter('appToken', index) as string;
	const tableId = this.getNodeParameter('tableId', index) as string;
	const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
	const limit = returnAll ? 0 : (this.getNodeParameter('limit', index, 50) as number);
	const options = this.getNodeParameter('options', index, {}) as any;

	const qs: Record<string, string | number | boolean> = { page_size: 500 };
	if (options.userIdType) qs.user_id_type = options.userIdType;
	if (options.textFieldAsArray) qs.text_field_as_array = true;
	if (options.automaticFields) qs.automatic_fields = true;
	if (options.fieldNames) qs.field_names = options.fieldNames;
	if (options.viewId) qs.view_id = options.viewId;
	if (options.filterFormula) qs.filter = options.filterFormula;

	let allItems: any[] = [];
	let hasMore = true;

	while (hasMore) {
		const data = await feishuRequest.call(this, {
			method: 'GET',
			endpoint: `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records`,
			qs,
		});

		const items = data?.items || [];
		allItems.push(...items);

		hasMore = !!data?.has_more && !!data?.page_token;
		if (hasMore) {
			qs.page_token = data.page_token;
		}

		if (!returnAll && allItems.length >= limit) {
			allItems = allItems.slice(0, limit);
			break;
		}
	}

	const records = options.simplify !== false ? simplifyRecords(allItems) : allItems;
	return records.map((record: any) => ({
		json: record,
		pairedItem: { item: index },
	}));
}
