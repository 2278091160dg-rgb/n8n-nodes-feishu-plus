import { executeSearchRecords } from '../../../../nodes/Feishu/actions/bitable/searchRecords';

jest.mock('../../../../transport/request', () => ({
	feishuRequest: jest.fn(),
}));

import { feishuRequest } from '../../../../transport/request';

describe('executeSearchRecords', () => {
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

	it('should search records with filter', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(false) // returnAll
			.mockReturnValueOnce(50) // limit
			.mockReturnValueOnce('{"conjunction":"and","conditions":[]}') // filter
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			items: [{ record_id: 'r1', fields: { Status: 'Active' } }],
			has_more: false,
		});

		const result = await executeSearchRecords.call(mockContext, 0);
		expect(result).toHaveLength(1);
		expect(feishuRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				endpoint: expect.stringContaining('/records/search'),
			}),
		);
	});

	it('should paginate search results with returnAll', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(true) // returnAll
			.mockReturnValueOnce('') // filter
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

		const result = await executeSearchRecords.call(mockContext, 0);
		expect(result).toHaveLength(2);
	});

	it('should propagate errors', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(50)
			.mockReturnValueOnce('')
			.mockReturnValueOnce({});

		(feishuRequest as unknown as jest.Mock).mockRejectedValue(new Error('Search failed'));

		await expect(executeSearchRecords.call(mockContext, 0)).rejects.toThrow('Search failed');
	});
});
