import { executeBatchCreate } from '../../../../nodes/Feishu/actions/bitable/batchCreate';

jest.mock('../../../../transport/request', () => ({
	feishuRequest: jest.fn(),
}));

import { feishuRequest } from '../../../../transport/request';

describe('executeBatchCreate', () => {
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

	it('should batch create records', async () => {
		const records = [{ fields: { Name: 'A' } }, { fields: { Name: 'B' } }];
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(records)
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			records: [
				{ record_id: 'r1', fields: { Name: 'A' } },
				{ record_id: 'r2', fields: { Name: 'B' } },
			],
		});

		const result = await executeBatchCreate.call(mockContext, 0);
		expect(result).toHaveLength(2);
		expect(feishuRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				endpoint: expect.stringContaining('/batch_create'),
				body: { records },
			}),
		);
	});

	it('should throw when exceeding 500 records', async () => {
		const records = Array.from({ length: 501 }, (_, i) => ({ fields: { i } }));
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(records)
			.mockReturnValueOnce({});

		await expect(executeBatchCreate.call(mockContext, 0)).rejects.toThrow('max 500');
	});

	it('should parse string input as JSON', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce('[{"fields":{"Name":"A"}}]')
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({ records: [] });

		await executeBatchCreate.call(mockContext, 0);
		expect(feishuRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				body: { records: [{ fields: { Name: 'A' } }] },
			}),
		);
	});
});
