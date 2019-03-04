import { Model, Document } from 'mongoose';

import errorHandler from './utils/errorHandler';
import logger from './utils/logger';

export interface IServiceParams {
  criteria?: any;
  skip?: number;
  limit: number;
  pagination?: boolean;
  sort?: string;
  user?: any;
}
export interface IPaginatedResult {
  results: any[];
  skip?: number;
  limit?: number;
  page_number?: number;
  total_record_count?: number;
}

export interface IErrorInfo {
  code: string | number;
  message: string;
}
export const isServiceParams = (params: any): params is IServiceParams => {
  return params.limit !== undefined;
};
export const isResult = (result: any): result is IPaginatedResult => {
  return result.results !== undefined;
};

export const isError = (error: any): error is IErrorInfo => {
  return error.code !== undefined;
};

export default abstract class Service<Doc extends Document, DocModel extends Model<Doc>> {
  modelName: string;
  constructor(public model: DocModel) {
    this.modelName = model && model.modelName;
  }

  async create(data, user?): Promise<Doc | IErrorInfo> {
    try {
      data.createdOn = new Date().getTime();
      const newMember = new this.model(data);
      return await newMember.save();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async getAll(params, toPopulate?, selectedFields?): Promise<IPaginatedResult | IErrorInfo>;

  async getAll(
    criteria?,
    skip?: number,
    limit?: number,
    pagination?: boolean,
    sort?: string,
    toPopulate?: string[],
    selectedFields?
  ): Promise<IPaginatedResult | IErrorInfo>;

  async getAll(
    criteria?,
    skipOrToPopulate?: number | Array<string>,
    limitOrSelectedFields?: number,
    pagination?: boolean,
    sort?: string,
    toPopulate?: string[],
    selectedFields?
  ): Promise<IPaginatedResult | IErrorInfo> {
    try {
      if (isServiceParams(criteria)) {
        criteria.skip = criteria.skip || 0;
        criteria.limit = criteria.limit || 50;
        criteria.criteria = { ...criteria.criteria, deleted: { $ne: true } };
        const sortObj = {};
        if (criteria.sort) {
          const partsOfSort = criteria.sort.split(',');
          const sortField = partsOfSort[0];
          const sortOrder = partsOfSort[1];
          sortObj[sortField] = sortOrder;
        }

        let numberOfEntities = 0;
        let query;
        if (criteria.pagination) {
          logger.msg(`Getting all ${this.modelName}.`);
          //TODO : find a better way to get pagination
          numberOfEntities = await this.model.find(criteria.criteria).count();
          query = this.model
            .find(criteria.criteria, undefined, {
              skip: criteria.skip,
              limit: criteria.limit
            })
            .collation({ locale: 'en', caseFirst: 'lower' })
            .sort(sortObj);
        } else {
          query = this.model
            .find(criteria.criteria, undefined)
            .collation({ locale: 'en', caseFirst: 'lower' })
            .sort(sortObj);
        }
        if (Array.isArray(skipOrToPopulate)) {
          while (skipOrToPopulate && skipOrToPopulate.length) {
            const x = skipOrToPopulate.pop();
            if (x) {
              query.populate(x);
            }
          }
        }

        if (sortObj) {
          query.sort(sortObj);
        }

        if (Array.isArray(limitOrSelectedFields)) {
          query.select(limitOrSelectedFields.join(' '));
        }

        const entities = await query;

        return criteria.pagination
          ? {
            skip: criteria.skip,
            limit: criteria.limit,
            page_number: Math.floor(criteria.skip / criteria.limit) + 1,
            total_record_count: numberOfEntities,
            results: entities
          }
          : { results: entities };
      } else {
        if (typeof skipOrToPopulate === 'number' && typeof limitOrSelectedFields === 'number') {
          skipOrToPopulate = skipOrToPopulate || 0;
          limitOrSelectedFields = limitOrSelectedFields || 50;
          criteria = { ...criteria, deleted: false };
          const sortObj = {};
          if (sort) {
            const partsOfSort = sort.split(',');
            const sortField = partsOfSort[0];
            const sortOrder = partsOfSort[1];
            sortObj[sortField] = sortOrder;
          }

          let numberOfEntities = 0;

          if (pagination) {
            logger.msg(`Getting all ${this.modelName}.`);
            //TODO : find a better way to get pagination
            numberOfEntities = await this.model.find(criteria).count();
          }
          const query = this.model
            .find(criteria, undefined, {
              skip: skipOrToPopulate,
              limit: limitOrSelectedFields
            })
            .collation({ locale: 'en', caseFirst: 'lower' })
            .sort(sortObj);
          while (toPopulate && toPopulate.length) {
            const x = toPopulate.pop();
            if (x) {
              query.populate(x);
            }
          }

          if (sortObj) {
            query.sort(sortObj);
          }

          if (Array.isArray(selectedFields)) {
            query.select(selectedFields.join(' '));
          }

          const entities = await query;

          return pagination
            ? {
              skip: skipOrToPopulate,
              limit: limitOrSelectedFields,
              page_number: Math.floor(skipOrToPopulate / limitOrSelectedFields) + 1,
              total_record_count: numberOfEntities,
              results: entities
            }
            : { results: entities };
        } else {
          return Promise.reject({
            code: 'TYPE_ERROR',
            message: 'Types not accepted'
          });
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async getById(id: string, user?): Promise<Doc | IErrorInfo> {
    try {
      logger.msg(`Getting ${this.modelName} with id ${id}.`);
      const model = await this.model.findOne({ _id: id, deleted: { $ne: true } });
      if (!model) return { code: 'NOT_FOUND', message: `${this.modelName} with id ${id} not found` };
      return model;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async update(id: string, data: Doc, user?): Promise<Doc | IErrorInfo> {
    try {
      logger.msg(`Updating ${this.modelName} with id ${id}.`);
      const outdatedModel = await this.getById(id, user);
      if (isError(outdatedModel)) return Promise.reject(outdatedModel);
      const mergedModel = Object.assign(outdatedModel, data);
      const result = await this.model.update({ _id: id }, mergedModel, {
        upsert: true
      });
      const updatedModel = await this.getById(id, user);
      return updatedModel;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async delete(id: string, user?) {
    try {
      logger.msg(`Deleting ${this.modelName} with id ${id}`);
      const member = await this.model.findById(id);
      if (this.model.schema.tree.deleted) {
        if (member) {
          await this.model.update({ _id: id }, { deleted: true }, { upsert: true });
          return member;
        } else {
          return Promise.reject({ code: 'NOT_FOUND', message: `${this.modelName} not found` });
        }
      } else {
        if (member) {
          return await this.model.findOneAndRemove({ _id: id });
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
