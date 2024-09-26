// #配置文件
import { get, mapValues, toUpper } from 'lodash';
import path from 'path';

import { config } from 'dotenv';
const configOut = config({
  path: path.join(__dirname, '../../env/.code-generator.env.development'),
}); // 加载指定的 .env 文件

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
    return get(configOut.parsed, toUpper(key));
  });
};
