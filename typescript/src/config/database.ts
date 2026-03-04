import { Sequelize } from 'sequelize';
import Logger from './logger';

const LOG = new Logger('database.js');

const sequelize = new Sequelize(
  process.env.DB_SCHEMA,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    dialect: 'mysql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    pool: {
      acquire: 30000,
      idle: 1000,
      max: 100,
      min: 1,
    },
    timezone: '+08:00',
    logging: msg => {
      LOG.log('info', msg);
    },
  }
);

export default sequelize;
