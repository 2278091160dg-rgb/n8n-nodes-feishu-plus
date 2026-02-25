import { executeListTables } from '../../../../nodes/Feishu/actions/bitable/listTables';

jest.mock('../../../../transport/request', () => ({
	feishuRequest: jest.fn(),
}));

import { feishuRequest } from '../../../../transport/request';

describe('executeListTables', () => {
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

	it('should list tables', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce(false) // returnAll
			.mockReturnValueOnce(50); // limit

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			items: [
				{ table_id: 'tbl1', name: 'Table 1' },
				{ table_id: 'tbl2', name: 'Table 2' },
			],
			has_more: false,
		});

		const result = await executeListTables.call(mockContext, 0);
		expect(result).toHaveLength(2);
		expect(result[0].json.table_id).toBe('tbl1');
	});

	it('should paginate with returnAll', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce(true); // returnAll

		(feishuRequest as unknown as jest.Mock)
			.mockResolvedValueOnce({
				items: [{ table_id: 'tbl1' }],
				has_more: true,
				page_token: 'pt1',
			})
			.mockResolvedValueOnce({
				items: [{ table_id: 'tbl2' }],
				has_more: false,
			});

		const result = await executeListTables.call(mockContext, 0);
		expect(result).toHaveLength(2);
	});

	it('should propagate errors', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(50);

		(feishuRequest as unknown as jest.Mock).mockRejectedValue(new Error('List tables failed'));

		await expect(executeListTables.call(mockContext, 0)).rejects.toThrow('List tables failed');
	});
});
