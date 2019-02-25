import * as moment from 'moment';

export class Logger {
  msg(message: string) {
    console.log('\x1b[33m%s\x1b[0m', `[base-service][${moment().format('MMMM Do YYYY, h:mm:ss a')}] ` + message);
  }

  err(message: string) {
    console.log('\x1b[31m%s\x1b[0m', `[base-service][${moment().format('MMMM Do YYYY, h:mm:ss a')}] Error: ` + message);
  }

  route(message: string, params: any) {
    console.log('\x1b[34m%s\x1b[0m', `[base-service][${moment().format('MMMM Do YYYY, h:mm:ss a')}][Route] ` + message, params);
  }
}
const logger = new Logger();
export default logger;
