import { Model, Document } from 'mongoose';
import { ObjectID } from 'mongodb';

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
    console.warn(data);
    data.createdOn = new Date().getTime();
    const newMember = new this.model(data);
    return await newMember.save();
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
    console.log(criteria);
    console.log(toPopulate);
    if (isServiceParams(criteria)) {
      console.log('is service params');
      criteria.skip = criteria.skip || 0;
      criteria.limit = criteria.limit || 50;
      criteria.criteria = { ...criteria.criteria, deleted: false };
      const sortObj = {};
      if (criteria.sort) {
        const partsOfSort = criteria.sort.split(',');
        const sortField = partsOfSort[0];
        const sortOrder = partsOfSort[1];
        sortObj[sortField] = sortOrder;
      }

      let numberOfEntities = 0;

      if (criteria.pagination) {
        logger.msg(`Getting all ${this.modelName}.`);
        //TODO : find a better way to get pagination
        numberOfEntities = await this.model.find(criteria.criteria).count();
      }
      const query = this.model
        .find(criteria.criteria, undefined, {
          skip: criteria.skip,
          limit: criteria.limit
        })
        .collation({ locale: 'en', caseFirst: 'lower' })
        .sort(sortObj);
      if (Array.isArray(skipOrToPopulate)) {
        while (skipOrToPopulate && skipOrToPopulate.length) {
          const x = skipOrToPopulate.pop();
          console.log(x);
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
            skipOrToPopulate,
            limitOrSelectedFields
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
        return {
          code: 'TYPE_ERROR',
          message: 'Types not accepted'
        };
      }
    }
  }

  async getById(id: string, user?): Promise<Doc | IErrorInfo> {
    logger.msg(`Getting ${this.modelName} with id ${id}.`);
    return await this.model.findById(id);
  }
  async update(id: string, data: Doc, user?): Promise<Doc | IErrorInfo> {
    logger.msg(`Updating ${this.modelName} with id ${id}.`);
    const outdatedModel = await this.getById(id);
    const mergedModel = Object.assign(outdatedModel, data);
    const result = await this.model.update({ _id: id }, mergedModel, {
      upsert: true
    });
    const updatedModel = await this.getById(id);
    return updatedModel;
  }

  async delete(id: string, user?) {
    logger.msg('Deleting member with id: ' + id);

    const member = await this.getById(id);
    if (member) {
      await this.model.update({ _id: id }, { deleted: true }, { upsert: true });
      return member;
    } else {
      throw { code: 'NOT_FOUND', message: 'Member not found' };
    }
  }
}
