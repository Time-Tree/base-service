"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../utils/logger");
function errorHandler(error) {
    logger_1.default.err(error.message);
    return { ERROR: error };
}
exports.default = errorHandler;
