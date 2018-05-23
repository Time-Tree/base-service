import { Model, Document } from 'mongoose';
import { ObjectID } from 'mongodb';

import errorHandler from './utils/errorHandler';
import logger from './utils/logger';

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

  async getAll(
    criteria?,
    skip?: number,
    limit?: number,
    pagination?: boolean,
    sort?: string,
    toPopulate?: string[],
    selectedFields?,
    user?
  ): Promise<IPaginatedResult | IErrorInfo> {
    // generating initial criteria
    skip = skip || 0;
    limit = limit || 50;
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
        skip,
        limit
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
          skip,
          limit,
          page_number: Math.floor(skip / limit) + 1,
          total_record_count: numberOfEntities,
          results: entities
        }
      : { results: entities };
  }

  async getById(id: string, user?) {
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
