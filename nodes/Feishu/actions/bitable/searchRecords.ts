import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { feishuRequest } from '../../../../transport/request';
import { simplifyRecords } from '../../../../transport/response';

export async function executeSearchRecords(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const appToken = this.getNodeParameter('appToken', index) as string;
	const tableId = this.getNodeParameter('tableId', index) as string;
	const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
	const limit = returnAll ? 0 : (this.getNodeParameter('limit', index, 50) as number);
	const filter = this.getNodeParameter('filter', index, '') as string | object;
	const options = this.getNodeParameter('options', index, {}) as any;

	const qs: Record<string, string> = {};
	if (options.userIdType) qs.user_id_type = options.userIdType;

	const body: any = { page_size: 500 };
	if (filter) {
		body.filter = typeof filter === 'string' ? JSON.parse(filter) : filter;
	}
	if (options.sort) {
		body.sort = typeof options.sort === 'string' ? JSON.parse(options.sort) : options.sort;
	}
	if (options.fieldNames) {
		body.field_names = options.fieldNames.split(',').map((s: string) => s.trim());
	}
	if (options.automaticFields) body.automatic_fields = true;
	if (options.viewId) body.view_id = options.viewId;

	let allItems: any[] = [];
	let hasMore = true;

	while (hasMore) {
		const data = await feishuRequest.call(this, {
			method: 'POST',
			endpoint: `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/search`,
			body,
			qs,
		});

		const items = data?.items || [];
		allItems.push(...items);

		hasMore = !!data?.has_more && !!data?.page_token;
		if (hasMore) {
			body.page_token = data.page_token;
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
