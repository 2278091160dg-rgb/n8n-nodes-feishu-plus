import { executeCreateRecord } from '../../../../nodes/Feishu/actions/bitable/createRecord';

jest.mock('../../../../transport/request', () => ({
	feishuRequest: jest.fn(),
}));

import { feishuRequest } from '../../../../transport/request';

describe('executeCreateRecord', () => {
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

	it('should create a record successfully', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce({ Name: 'New' })
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			record: { record_id: 'recNew', fields: { Name: 'New' } },
		});

		const result = await executeCreateRecord.call(mockContext, 0);

		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual({ record_id: 'recNew', fields: { Name: 'New' } });
		expect(feishuRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				body: { fields: { Name: 'New' } },
			}),
		);
	});

	it('should propagate errors', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce({})
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockRejectedValue(new Error('Create failed'));

		await expect(executeCreateRecord.call(mockContext, 0)).rejects.toThrow('Create failed');
	});

	it('should pass userIdType option', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce({})
			.mockReturnValueOnce({ userIdType: 'user_id' });

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			record: { record_id: 'r1', fields: {} },
		});

		await executeCreateRecord.call(mockContext, 0);
		expect(feishuRequest).toHaveBeenCalledWith(
			expect.objectContaining({ qs: { user_id_type: 'user_id' } }),
		);
	});
});
