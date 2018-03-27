"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Logger {
    msg(message) {
        console.log('\x1b[33m%s\x1b[0m', '[logger] ' + message);
    }
    err(message) {
        console.log('\x1b[31m%s\x1b[0m', '[logger] Error: ' + message);
    }
    server(message) {
        console.log('\x1b[34m%s\x1b[0m', '[server] ' + message);
    }
}
exports.Logger = Logger;
const logger = new Logger();
exports.default = logger;
