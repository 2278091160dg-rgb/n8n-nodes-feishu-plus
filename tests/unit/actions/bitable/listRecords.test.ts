import { executeListRecords } from '../../../../nodes/Feishu/actions/bitable/listRecords';

jest.mock('../../../../transport/request', () => ({
	feishuRequest: jest.fn(),
}));

import { feishuRequest } from '../../../../transport/request';

describe('executeListRecords', () => {
	let mockContext: any;

	beforeEach(() => {
		jest.clearAllMocks();
		mockContext = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({}),
			getNode: jest.fn().mockReturnValue({ name: 'Feishu Plus' }),
			helpers: { httpRequest: jest.fn() },
		};
	});

	it('should list records with limit', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(false) // returnAll
			.mockReturnValueOnce(2) // limit
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			items: [
				{ record_id: 'r1', fields: { a: 1 } },
				{ record_id: 'r2', fields: { a: 2 } },
				{ record_id: 'r3', fields: { a: 3 } },
			],
			has_more: false,
		});

		const result = await executeListRecords.call(mockContext, 0);
		expect(result).toHaveLength(2);
		expect(result[0].json.record_id).toBe('r1');
	});

	it('should return all records with pagination', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(true) // returnAll
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock)
			.mockResolvedValueOnce({
				items: [{ record_id: 'r1', fields: {} }],
				has_more: true,
				page_token: 'pt1',
			})
			.mockResolvedValueOnce({
				items: [{ record_id: 'r2', fields: {} }],
				has_more: false,
			});

		const result = await executeListRecords.call(mockContext, 0);
		expect(result).toHaveLength(2);
		expect(feishuRequest).toHaveBeenCalledTimes(2);
	});

	it('should handle empty result', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(50)
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			items: [],
			has_more: false,
		});

		const result = await executeListRecords.call(mockContext, 0);
		expect(result).toHaveLength(0);
	});

	it('should propagate errors', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(50)
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockRejectedValue(new Error('List failed'));

		await expect(executeListRecords.call(mockContext, 0)).rejects.toThrow('List failed');
	});
});
