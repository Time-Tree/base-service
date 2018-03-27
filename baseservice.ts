import errorHandler from './utils/errorHandler';
import logger from './utils/logger';
import { Model, Document } from 'mongoose';

export default abstract class Service<Doc extends Document, DocModel extends Model<Doc>> {
  modelName: string;
  constructor(public model: DocModel) {
    this.modelName = model && model.modelName;
  }

  async create(data): Promise<Doc> {
    data.createdOn = new Date().getTime();
    const newMember = new this.model(data);
    return await newMember.save();
  }

  async getAll(criteria?, skip?: string, limit?: string, pagination?: boolean, sort?: string, toPopulate?: string[]) {
    const sortObj = {};
    if (sort) {
      const partsOfSort = sort.split(',');
      const sortField = partsOfSort[0];
      const sortOrder = partsOfSort[1];
      sortObj[sortField] = sortOrder;
    }

    let skipNr = 0;
    let limitNr = 0;
    let numberOfEntities = 0;

    if (pagination) {
      skipNr = skip ? parseInt(skip, 10) : 0;
      limitNr = limit ? parseInt(limit, 10) : 0;
      logger.msg(`Getting all ${this.modelName}.`);
      // // TODO : find a better way to get pagination
      numberOfEntities = await this.model.find({ ...criteria, deleted: false }).count();
    }

    const query = this.model
      .find({ ...criteria, deleted: false }, undefined, {
        skip: skipNr,
        limit: limitNr
      })
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
    const entities = await query;
    return pagination
      ? {
          page_number: Math.floor(skipNr / limitNr) + 1,
          page_size: limitNr,
          total_record_count: numberOfEntities,
          results: entities
        }
      : { results: entities };
  }

  async getById(id: string) {
    logger.msg(`Getting ${this.modelName} with id ${id}.`);
    return await this.model.findById(id);
  }
  async update(id: string, data: Doc) {
    logger.msg(`Updating ${this.modelName} with id ${id}.`);
    const outdatedModel = await this.getById(id);
    const mergedModel = Object.assign(outdatedModel, data);
    const result = await this.model.update({ _id: id }, mergedModel, {
      upsert: true
    });
    const updatedModel = await this.getById(id);
    return updatedModel;
  }

  async delete(id: string) {
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
