import logger from "../utils/logger";

export default function errorHandler(error) {
  logger.err(error.message);
  return { ERROR: error };
}
