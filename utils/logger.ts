export class Logger {
  msg(message: string) {
    console.log('\x1b[33m%s\x1b[0m', '[logger] ' + message);
  }

  err(message: string) {
    console.log('\x1b[31m%s\x1b[0m', '[logger] Error: ' + message);
  }

  server(message: string) {
    console.log('\x1b[34m%s\x1b[0m', '[server] ' + message);
  }
}
const logger = new Logger();
export default logger;
