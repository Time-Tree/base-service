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
const errorHandler_1 = require("./utils/errorHandler");
class BaseRoutes {
    constructor(router, service) {
        this.service = service;
        this.initHandlers(service);
        this.initRoutes(router);
    }
    initHandlers(service) {
        this.create = this.routeHandler(service.create, req => [req.body]);
        this.readone = this.routeHandler(service.getById, req => [req.params.id]);
        this.readall = this.routeHandler(service.getAll, req => [
            req.query.criteria ? JSON.parse(req.query.criteria) : null,
            req.query.skip || '0',
            req.query.limit || '5',
            (req.query.pagination || 'true') === 'true',
            req.query.sort || null
        ]);
        this.update = this.routeHandler(service.update, req => [req.params.id, req.body]);
        this.del = this.routeHandler(service.delete, req => [req.params.id]);
        this.notallowed = this.routeHandler(() => Promise.reject('Not Allowed!'));
    }
    initRoutes(router) {
        router.post('/', this.create);
        router.get('/', this.readall);
        router.get('/:id', this.readone);
        router.put('/:id', this.update);
        router.delete('/:id', this.del);
    }
    routeHandler(serviceMethod, parser) {
        return (req, res) => __awaiter(this, void 0, void 0, function* () {
            logger_1.default.msg(`Route ${req.url}.`);
            try {
                let args = [];
                if (parser) {
                    args = parser(req, res);
                }
                const response = yield serviceMethod.call(this.service, ...args);
                res.status(200).send(response);
            }
            catch (error) {
                res.status(500).send(errorHandler_1.default(error));
            }
        });
    }
}
exports.default = BaseRoutes;
