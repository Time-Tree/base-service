"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./utils/logger");
class Service {
    constructor(model) {
        this.model = model;
        this.modelName = model && model.modelName;
    }
    create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            data.createdOn = new Date().getTime();
            const newMember = new this.model(data);
            return yield newMember.save();
        });
    }
    getAll(criteria, skip, limit, pagination, sort, toPopulate) {
        return __awaiter(this, void 0, void 0, function* () {
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
                logger_1.default.msg(`Getting all ${this.modelName}.`);
                // // TODO : find a better way to get pagination
                numberOfEntities = yield this.model.find(Object.assign({}, criteria, { deleted: false })).count();
            }
            const query = this.model
                .find(Object.assign({}, criteria, { deleted: false }), undefined, {
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
            const entities = yield query;
            return pagination
                ? {
                    page_number: Math.floor(skipNr / limitNr) + 1,
                    page_size: limitNr,
                    total_record_count: numberOfEntities,
                    results: entities
                }
                : { results: entities };
        });
    }
    getById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.msg(`Getting ${this.modelName} with id ${id}.`);
            return yield this.model.findById(id);
        });
    }
    update(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.msg(`Updating ${this.modelName} with id ${id}.`);
            const outdatedModel = yield this.getById(id);
            const mergedModel = Object.assign(outdatedModel, data);
            const result = yield this.model.update({ _id: id }, mergedModel, {
                upsert: true
            });
            const updatedModel = yield this.getById(id);
            return updatedModel;
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.msg('Deleting member with id: ' + id);
            const member = yield this.getById(id);
            if (member) {
                yield this.model.update({ _id: id }, { deleted: true }, { upsert: true });
                return member;
            }
            else {
                throw { code: 'NOT_FOUND', message: 'Member not found' };
            }
        });
    }
}
exports.default = Service;
