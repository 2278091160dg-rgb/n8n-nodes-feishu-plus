import { FeishuApiError } from './error';

export interface FeishuResponse {
	code: number;
	msg: string;
	data?: any;
}

export interface FeishuPaginatedData {
	items?: any[];
	page_token?: string;
	has_more?: boolean;
	total?: number;
}

export function parseFeishuResponse(response: any): any {
	if (response.code !== undefined && response.code !== 0) {
		throw new FeishuApiError(
			`Feishu API error: ${response.msg || 'Unknown error'}`,
			response.code,
		);
	}
	return response.data ?? response;
}

export function simplifyRecord(record: any): any {
	if (!record) return record;
	return {
		record_id: record.record_id,
		fields: record.fields,
	};
}

export function simplifyRecords(records: any[]): any[] {
	return records.map(simplifyRecord);
}
