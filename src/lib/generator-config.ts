// #配置文件
import config from 'config';
import { mapValues } from 'lodash';

const database = {
  host: 'localhost',
  dialect: 'postgres',
  port: 5432,
  username: 'postgres',
  password: '123456',
  database: 'ecp_dev',
  schema: 'public',
  synchronize: false,
};

export const getDataBase = () => {
  return mapValues(database, (_value, key) => {
    return config.get(key);
  });
};
