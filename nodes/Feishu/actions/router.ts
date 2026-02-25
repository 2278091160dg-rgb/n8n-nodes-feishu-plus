import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { executeUpdateRecord } from './bitable/updateRecord';
import { executeGetRecord } from './bitable/getRecord';
import { executeCreateRecord } from './bitable/createRecord';
import { executeDeleteRecord } from './bitable/deleteRecord';
import { executeListRecords } from './bitable/listRecords';
import { executeSearchRecords } from './bitable/searchRecords';
import { executeBatchCreate } from './bitable/batchCreate';
import { executeBatchUpdate } from './bitable/batchUpdate';
import { executeBatchDelete } from './bitable/batchDelete';
import { executeListTables } from './bitable/listTables';
import { executeListFields } from './bitable/listFields';

const operationMap: Record<string, (this: IExecuteFunctions, index: number) => Promise<INodeExecutionData[]>> = {
	updateRecord: executeUpdateRecord,
	getRecord: executeGetRecord,
	createRecord: executeCreateRecord,
	deleteRecord: executeDeleteRecord,
	listRecords: executeListRecords,
	searchRecords: executeSearchRecords,
	batchCreate: executeBatchCreate,
	batchUpdate: executeBatchUpdate,
	batchDelete: executeBatchDelete,
	listTables: executeListTables,
	listFields: executeListFields,
};

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;
			const key = operation;

			const handler = operationMap[key];
			if (!handler) {
				throw new Error(`Unknown resource/operation: ${resource}/${operation}`);
			}

			const result = await handler.call(this, i);
			returnData.push(...result);
		} catch (error: any) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: error.message },
					pairedItem: { item: i },
				});
				continue;
			}
			throw error;
		}
	}

	return [returnData];
}
