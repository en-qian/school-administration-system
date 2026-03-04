export declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      PORT: string;

      DB_USERNAME: string;
      DB_PASSWORD: string;
      DB_HOST: string;
      DB_USER: string;
      DB_SCHEMA: string;
      DB_PORT: string;

      DB_POOL_ACQUIRE: string;
      DB_POOL_IDLE: string;
      DB_POOL_MAX_CONN: string;
      DB_POOL_MIN_CONN: string;
      DB_LOG_LEVEL: string;

      LOG_LEVEL: string;
      EXTERNAL_STUDENT_BASE_API_URL: string;
    }
  }
}
