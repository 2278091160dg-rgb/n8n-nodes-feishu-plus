import { parseFeishuResponse, simplifyRecord, simplifyRecords } from '../../../transport/response';

describe('parseFeishuResponse', () => {
	it('should return data for successful response', () => {
		const response = { code: 0, msg: 'ok', data: { items: [1, 2, 3] } };
		expect(parseFeishuResponse(response)).toEqual({ items: [1, 2, 3] });
	});

	it('should return full response when data is undefined', () => {
		const response = { code: 0, msg: 'ok' };
		expect(parseFeishuResponse(response)).toEqual({ code: 0, msg: 'ok' });
	});

	it('should throw on non-zero code with feishuCode', () => {
		const response = { code: 1254003, msg: 'Record not found' };
		try {
			parseFeishuResponse(response);
			fail('Should have thrown');
		} catch (error: any) {
			expect(error.message).toContain('Record not found');
			expect(error.feishuCode).toBe(1254003);
		}
	});

	it('should throw on token expired code', () => {
		const response = { code: 99991663, msg: 'token expired' };
		try {
			parseFeishuResponse(response);
			fail('Should have thrown');
		} catch (error: any) {
			expect(error.feishuCode).toBe(99991663);
		}
	});

	it('should handle response without code field', () => {
		const response = { result: 'ok' };
		expect(parseFeishuResponse(response)).toEqual({ result: 'ok' });
	});

	it('should throw with default message when msg is empty', () => {
		const response = { code: 9999, msg: '' };
		try {
			parseFeishuResponse(response);
			fail('Should have thrown');
		} catch (error: any) {
			expect(error.message).toContain('Unknown error');
		}
	});
});

describe('simplifyRecord', () => {
	it('should extract record_id and fields', () => {
		const record = {
			record_id: 'rec123',
			fields: { name: 'test' },
			extra_field: 'ignored',
		};
		expect(simplifyRecord(record)).toEqual({
			record_id: 'rec123',
			fields: { name: 'test' },
		});
	});

	it('should return null/undefined as-is', () => {
		expect(simplifyRecord(null)).toBeNull();
		expect(simplifyRecord(undefined)).toBeUndefined();
	});
});

describe('simplifyRecords', () => {
	it('should simplify array of records', () => {
		const records = [
			{ record_id: 'r1', fields: { a: 1 }, extra: 'x' },
			{ record_id: 'r2', fields: { b: 2 }, extra: 'y' },
		];
		expect(simplifyRecords(records)).toEqual([
			{ record_id: 'r1', fields: { a: 1 } },
			{ record_id: 'r2', fields: { b: 2 } },
		]);
	});

	it('should return empty array for empty input', () => {
		expect(simplifyRecords([])).toEqual([]);
	});
});
