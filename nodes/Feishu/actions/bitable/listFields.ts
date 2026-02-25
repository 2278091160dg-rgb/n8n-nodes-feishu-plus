import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { feishuRequest } from '../../../../transport/request';

export async function executeListFields(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const appToken = this.getNodeParameter('appToken', index) as string;
	const tableId = this.getNodeParameter('tableId', index) as string;
	const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
	const limit = returnAll ? 0 : (this.getNodeParameter('limit', index, 50) as number);

	const qs: Record<string, string | number> = { page_size: 100 };

	let allItems: any[] = [];
	let hasMore = true;

	while (hasMore) {
		const data = await feishuRequest.call(this, {
			method: 'GET',
			endpoint: `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/fields`,
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

	return allItems.map((field: any) => ({
		json: field,
		pairedItem: { item: index },
	}));
}
