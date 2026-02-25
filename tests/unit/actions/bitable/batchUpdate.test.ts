import { executeBatchUpdate } from '../../../../nodes/Feishu/actions/bitable/batchUpdate';

jest.mock('../../../../transport/request', () => ({
	feishuRequest: jest.fn(),
}));

import { feishuRequest } from '../../../../transport/request';

describe('executeBatchUpdate', () => {
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

	it('should batch update records', async () => {
		const records = [{ record_id: 'r1', fields: { Name: 'Updated' } }];
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(records)
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			records: [{ record_id: 'r1', fields: { Name: 'Updated' } }],
		});

		const result = await executeBatchUpdate.call(mockContext, 0);
		expect(result).toHaveLength(1);
		expect(feishuRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				endpoint: expect.stringContaining('/batch_update'),
			}),
		);
	});

	it('should throw when exceeding 500 records', async () => {
		const records = Array.from({ length: 501 }, (_, i) => ({ record_id: `r${i}`, fields: {} }));
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(records)
			.mockReturnValueOnce({});

		await expect(executeBatchUpdate.call(mockContext, 0)).rejects.toThrow('max 500');
	});

	it('should propagate errors', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce([])
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockRejectedValue(new Error('Update failed'));

		await expect(executeBatchUpdate.call(mockContext, 0)).rejects.toThrow('Update failed');
	});
});
