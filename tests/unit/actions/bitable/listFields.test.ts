import { executeListFields } from '../../../../nodes/Feishu/actions/bitable/listFields';

jest.mock('../../../../transport/request', () => ({
	feishuRequest: jest.fn(),
}));

import { feishuRequest } from '../../../../transport/request';

describe('executeListFields', () => {
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

	it('should list fields', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(false) // returnAll
			.mockReturnValueOnce(50); // limit

		(feishuRequest as unknown as jest.Mock).mockResolvedValue({
			items: [
				{ field_id: 'f1', field_name: 'Name', type: 1 },
				{ field_id: 'f2', field_name: 'Status', type: 3 },
			],
			has_more: false,
		});

		const result = await executeListFields.call(mockContext, 0);
		expect(result).toHaveLength(2);
		expect(result[0].json.field_name).toBe('Name');
	});

	it('should paginate with returnAll', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(true); // returnAll

		(feishuRequest as unknown as jest.Mock)
			.mockResolvedValueOnce({
				items: [{ field_id: 'f1' }],
				has_more: true,
				page_token: 'pt1',
			})
			.mockResolvedValueOnce({
				items: [{ field_id: 'f2' }],
				has_more: false,
			});

		const result = await executeListFields.call(mockContext, 0);
		expect(result).toHaveLength(2);
	});

	it('should propagate errors', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('app1')
			.mockReturnValueOnce('tbl1')
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(50);

		(feishuRequest as unknown as jest.Mock).mockRejectedValue(new Error('List fields failed'));

		await expect(executeListFields.call(mockContext, 0)).rejects.toThrow('List fields failed');
	});
});
