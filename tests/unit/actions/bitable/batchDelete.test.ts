import { executeBatchDelete } from '../../../../nodes/Feishu/actions/bitable/batchDelete';

jest.mock('../../../../transport/request', () => ({
	feishuRequest: jest.fn(),
}));

import { feishuRequest } from '../../../../transport/request';

describe('executeBatchDelete', () => {
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

	it('should batch delete records', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(['r1', 'r2']);

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({});

		const result = await executeBatchDelete.call(mockContext, 0);
		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual({ success: true, deleted: 2 });
		expect(feishuRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				endpoint: expect.stringContaining('/batch_delete'),
				body: { records: ['r1', 'r2'] },
			}),
		);
	});

	it('should throw when exceeding 500 records', async () => {
		const ids = Array.from({ length: 501 }, (_, i) => `r${i}`);
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(ids);

		await expect(executeBatchDelete.call(mockContext, 0)).rejects.toThrow('max 500');
	});

	it('should parse string input as JSON', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce('["r1","r2"]');

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({});

		const result = await executeBatchDelete.call(mockContext, 0);
		expect(result[0].json.deleted).toBe(2);
	});
});
