import * as express from 'express';
import { Router } from 'express';
import { Document, Model } from 'mongoose';
import logger from './utils/logger';
import Service from './baseservice';
import errorHandler from './utils/errorHandler';

export default class BaseRoutes<T extends Service<Document, Model<Document>>> {
  protected create;
  protected readone;
  protected readall;
  protected update;
  protected del;
  protected notallowed;

  constructor(router: Router, private service: T) {
    this.initHandlers(service);
    this.initRoutes(router);
  }
  protected initHandlers(service: T) {
    this.create = this.routeHandler(service.create, req => [req.body, req.user]);
    this.readone = this.routeHandler(service.getById, req => [req.params.id, req.user]);
    this.readall = this.routeHandler(service.getAll, req => [
      {
        criteria: req.query.criteria ? JSON.parse(req.query.criteria) : null,
        skip: parseInt(req.query.skip, 10),
        limit: parseInt(req.query.limit, 10),
        pagination: (req.query.pagination || 'true') === 'true',
        sort: req.query.sort || null,
        user: req.user
      }
    ]);
    this.update = this.routeHandler(service.update, req => [req.params.id, req.body, req.user]);
    this.del = this.routeHandler(service.delete, req => [req.params.id, req.user]);
    this.notallowed = this.routeHandler(() => Promise.reject('Not Allowed!'));
  }

  protected initRoutes(router: Router) {
    router.post('/', this.create);
    router.get('/', this.readall);
    router.get('/:id', this.readone);
    router.put('/:id', this.update);
    router.delete('/:id', this.del);
  }

  protected routeHandler(serviceMethod, parser?: (req, res?) => any[]) {
    return async (req, res) => {
      logger.msg(`Route ${req.url}.`);
      try {
        let args: any[] = [];
        if (parser) {
          args = parser(req, res);
        }
        const response = await serviceMethod.call(this.service, ...args);
        res.status(200).send(response);
      } catch (error) {
        res.status(500).send(errorHandler(error));
      }
    };
  }
}
