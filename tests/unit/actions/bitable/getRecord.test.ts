import { executeGetRecord } from '../../../../nodes/Feishu/actions/bitable/getRecord';

jest.mock('../../../../transport/request', () => ({
	feishuRequest: jest.fn(),
}));

import { feishuRequest } from '../../../../transport/request';

describe('executeGetRecord', () => {
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

	it('should get a record successfully', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce('rec1')
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			record: { record_id: 'rec1', fields: { Name: 'Test' }, extra: 'x' },
		});

		const result = await executeGetRecord.call(mockContext, 0);

		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual({ record_id: 'rec1', fields: { Name: 'Test' } });
	});

	it('should return full record when simplify is false', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce('rec1')
			.mockReturnValueOnce({ simplify: false });

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			record: { record_id: 'rec1', fields: {}, extra: 'data' },
		});

		const result = await executeGetRecord.call(mockContext, 0);
		expect(result[0].json).toHaveProperty('extra');
	});

	it('should propagate errors', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce('rec1')
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockRejectedValue(new Error('Not found'));

		await expect(executeGetRecord.call(mockContext, 0)).rejects.toThrow('Not found');
	});
});
