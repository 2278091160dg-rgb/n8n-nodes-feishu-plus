import { router } from '../../nodes/Feishu/actions/router';

jest.mock('../../nodes/Feishu/actions/bitable/updateRecord', () => ({
	executeUpdateRecord: jest.fn().mockResolvedValue([{ json: { op: 'updateRecord' }, pairedItem: { item: 0 } }]),
}));
jest.mock('../../nodes/Feishu/actions/bitable/getRecord', () => ({
	executeGetRecord: jest.fn().mockResolvedValue([{ json: { op: 'getRecord' }, pairedItem: { item: 0 } }]),
}));
jest.mock('../../nodes/Feishu/actions/bitable/createRecord', () => ({
	executeCreateRecord: jest.fn().mockResolvedValue([{ json: { op: 'createRecord' }, pairedItem: { item: 0 } }]),
}));
jest.mock('../../nodes/Feishu/actions/bitable/deleteRecord', () => ({
	executeDeleteRecord: jest.fn().mockResolvedValue([{ json: { op: 'deleteRecord' }, pairedItem: { item: 0 } }]),
}));
jest.mock('../../nodes/Feishu/actions/bitable/listRecords', () => ({
	executeListRecords: jest.fn().mockResolvedValue([{ json: { op: 'listRecords' }, pairedItem: { item: 0 } }]),
}));
jest.mock('../../nodes/Feishu/actions/bitable/searchRecords', () => ({
	executeSearchRecords: jest.fn().mockResolvedValue([{ json: { op: 'searchRecords' }, pairedItem: { item: 0 } }]),
}));
jest.mock('../../nodes/Feishu/actions/bitable/batchCreate', () => ({
	executeBatchCreate: jest.fn().mockResolvedValue([{ json: { op: 'batchCreate' }, pairedItem: { item: 0 } }]),
}));
jest.mock('../../nodes/Feishu/actions/bitable/batchUpdate', () => ({
	executeBatchUpdate: jest.fn().mockResolvedValue([{ json: { op: 'batchUpdate' }, pairedItem: { item: 0 } }]),
}));
jest.mock('../../nodes/Feishu/actions/bitable/batchDelete', () => ({
	executeBatchDelete: jest.fn().mockResolvedValue([{ json: { op: 'batchDelete' }, pairedItem: { item: 0 } }]),
}));
jest.mock('../../nodes/Feishu/actions/bitable/listTables', () => ({
	executeListTables: jest.fn().mockResolvedValue([{ json: { op: 'listTables' }, pairedItem: { item: 0 } }]),
}));
jest.mock('../../nodes/Feishu/actions/bitable/listFields', () => ({
	executeListFields: jest.fn().mockResolvedValue([{ json: { op: 'listFields' }, pairedItem: { item: 0 } }]),
}));

import { executeUpdateRecord } from '../../nodes/Feishu/actions/bitable/updateRecord';
import { executeGetRecord } from '../../nodes/Feishu/actions/bitable/getRecord';

describe('router', () => {
	let mockContext: any;

	beforeEach(() => {
		jest.clearAllMocks();
		mockContext = {
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNodeParameter: jest.fn(),
			continueOnFail: jest.fn().mockReturnValue(false),
		};
	});

	it('should route to updateRecord', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('bitable')
			.mockReturnValueOnce('updateRecord');

		const result = await router.call(mockContext);
		expect(result).toHaveLength(1);
		expect(result[0][0].json.op).toBe('updateRecord');
		expect(executeUpdateRecord).toHaveBeenCalled();
	});

	it('should route to getRecord', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('bitable')
			.mockReturnValueOnce('getRecord');

		const result = await router.call(mockContext);
		expect(result[0][0].json.op).toBe('getRecord');
		expect(executeGetRecord).toHaveBeenCalled();
	});

	it('should throw on unknown operation', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('bitable')
			.mockReturnValueOnce('unknownOp');

		await expect(router.call(mockContext)).rejects.toThrow('Unknown resource/operation');
	});

	it('should handle continueOnFail', async () => {
		mockContext.getNodeParameter
			.mockReturnValueOnce('bitable')
			.mockReturnValueOnce('unknownOp');
		mockContext.continueOnFail.mockReturnValue(true);

		const result = await router.call(mockContext);
		expect(result[0]).toHaveLength(1);
		expect(result[0][0].json.error).toContain('Unknown resource/operation');
		expect(result[0][0].pairedItem).toEqual({ item: 0 });
	});

	it('should process multiple items', async () => {
		mockContext.getInputData.mockReturnValue([{ json: {} }, { json: {} }, { json: {} }]);
		mockContext.getNodeParameter
			.mockReturnValueOnce('bitable').mockReturnValueOnce('updateRecord')
			.mockReturnValueOnce('bitable').mockReturnValueOnce('updateRecord')
			.mockReturnValueOnce('bitable').mockReturnValueOnce('updateRecord');

		const result = await router.call(mockContext);
		expect(result[0]).toHaveLength(3);
	});

	it('should continue processing after error with continueOnFail', async () => {
		mockContext.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		mockContext.getNodeParameter
			.mockReturnValueOnce('bitable').mockReturnValueOnce('updateRecord')
			.mockReturnValueOnce('bitable').mockReturnValueOnce('getRecord');
		mockContext.continueOnFail.mockReturnValue(true);

		(executeUpdateRecord as jest.Mock)
			.mockRejectedValueOnce(new Error('First item failed'));

		const result = await router.call(mockContext);
		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json.error).toBe('First item failed');
		expect(result[0][1].json.op).toBe('getRecord');
	});

	it('should stop on error without continueOnFail', async () => {
		mockContext.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		mockContext.getNodeParameter
			.mockReturnValueOnce('bitable').mockReturnValueOnce('updateRecord');
		mockContext.continueOnFail.mockReturnValue(false);

		(executeUpdateRecord as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

		await expect(router.call(mockContext)).rejects.toThrow('Failed');
	});

	const operations = [
		'updateRecord', 'getRecord', 'createRecord', 'deleteRecord',
		'listRecords', 'searchRecords', 'batchCreate', 'batchUpdate',
		'batchDelete', 'listTables', 'listFields',
	];

	for (const op of operations) {
		it(`should route to ${op}`, async () => {
			mockContext.getNodeParameter
				.mockReturnValueOnce('bitable')
				.mockReturnValueOnce(op);

			const result = await router.call(mockContext);
			expect(result[0][0].json.op).toBe(op);
		});
	}
});
