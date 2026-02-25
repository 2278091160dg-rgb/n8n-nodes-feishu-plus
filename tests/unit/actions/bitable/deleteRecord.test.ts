import { executeDeleteRecord } from '../../../../nodes/Feishu/actions/bitable/deleteRecord';

jest.mock('../../../../transport/request', () => ({
	feishuRequest: jest.fn(),
}));

import { feishuRequest } from '../../../../transport/request';

describe('executeDeleteRecord', () => {
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

	it('should delete a record successfully', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce('rec1');

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({});

		const result = await executeDeleteRecord.call(mockContext, 0);

		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual({ success: true, deleted: true, record_id: 'rec1' });
		expect(feishuRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'DELETE',
				endpoint: '/open-apis/bitable/v1/apps/app1/tables/tbl1/records/rec1',
			}),
		);
	});

	it('should propagate errors', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce('rec1');

		(feishuRequest as unknown as jest.Mock).mockRejectedValue(new Error('Delete failed'));

		await expect(executeDeleteRecord.call(mockContext, 0)).rejects.toThrow('Delete failed');
	});

	it('should include pairedItem', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce('rec1');

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({});

		const result = await executeDeleteRecord.call(mockContext, 3);
		expect(result[0].pairedItem).toEqual({ item: 3 });
	});
});
