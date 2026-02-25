import { executeUpdateRecord } from '../../../../nodes/Feishu/actions/bitable/updateRecord';

jest.mock('../../../../transport/request', () => ({
	feishuRequest: jest.fn(),
}));

import { feishuRequest } from '../../../../transport/request';

describe('executeUpdateRecord', () => {
	let mockContext: any;

	beforeEach(() => {
		jest.clearAllMocks();
		mockContext = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({
				url: 'https://open.feishu.cn', appSecret: 's', accessToken: 't',
			}),
			getNode: jest.fn().mockReturnValue({ name: 'Feishu Plus' }),
			helpers: { httpRequest: jest.fn() },
		};
	});

	it('should update a record successfully', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('appToken1')
			.mockReturnValueOnce('tblId1')
			.mockReturnValueOnce('recId1')
			.mockReturnValueOnce({ Name: 'Updated' })
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			record: { record_id: 'recId1', fields: { Name: 'Updated' }, extra: 'x' },
		});

		const result = await executeUpdateRecord.call(mockContext, 0);

		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual({ record_id: 'recId1', fields: { Name: 'Updated' } });
		expect(result[0].pairedItem).toEqual({ item: 0 });
		expect(feishuRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'PUT',
				endpoint: '/open-apis/bitable/v1/apps/appToken1/tables/tblId1/records/recId1',
				body: { fields: { Name: 'Updated' } },
			}),
		);
	});

	it('should pass userIdType in query string', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce('rec1')
			.mockReturnValueOnce({})
			.mockReturnValueOnce({ userIdType: 'union_id' });

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			record: { record_id: 'rec1', fields: {} },
		});

		await executeUpdateRecord.call(mockContext, 0);

		expect(feishuRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				qs: { user_id_type: 'union_id' },
			}),
		);
	});

	it('should return full record when simplify is false', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce('rec1')
			.mockReturnValueOnce({})
			.mockReturnValueOnce({ simplify: false });

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			record: { record_id: 'rec1', fields: {}, extra: 'data' },
		});

		const result = await executeUpdateRecord.call(mockContext, 0);
		expect(result[0].json).toHaveProperty('extra', 'data');
	});

	it('should propagate errors', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce('rec1')
			.mockReturnValueOnce({})
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockRejectedValue(new Error('API error'));

		await expect(executeUpdateRecord.call(mockContext, 0)).rejects.toThrow('API error');
	});
});
