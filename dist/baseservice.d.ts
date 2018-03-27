import { Model, Document } from 'mongoose';
export default abstract class Service<Doc extends Document, DocModel extends Model<Doc>> {
    model: DocModel;
    modelName: string;
    constructor(model: DocModel);
    create(data: any): Promise<Doc>;
    getAll(criteria?: any, skip?: string, limit?: string, pagination?: boolean, sort?: string, toPopulate?: string[]): Promise<{
        page_number: number;
        page_size: number;
        total_record_count: number;
        results: any;
    } | {
        results: any;
        page_number?: undefined;
        page_size?: undefined;
        total_record_count?: undefined;
    }>;
    getById(id: string): Promise<any>;
    update(id: string, data: Doc): Promise<any>;
    delete(id: string): Promise<any>;
}
