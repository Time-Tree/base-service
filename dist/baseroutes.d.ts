import { Router } from 'express';
import { Document, Model } from 'mongoose';
import Service from './baseservice';
export default class BaseRoutes<T extends Service<Document, Model<Document>>> {
    private service;
    protected create: any;
    protected readone: any;
    protected readall: any;
    protected update: any;
    protected del: any;
    protected notallowed: any;
    constructor(router: Router, service: T);
    protected initHandlers(service: T): void;
    protected initRoutes(router: Router): void;
    protected routeHandler(serviceMethod: any, parser?: (req, res?) => any[]): (req: any, res: any) => Promise<void>;
}
