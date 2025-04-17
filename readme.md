## 使用

- setting[env/.code-generator.env.development]

```json
HOST=localhost
DIALECT=postgres
PORT=5432
USERNAME=postgres
PASSWORD=123456
DATABASE=ecp_dev
SCHEMA=public
SYNCHRONIZE=false
```
支持 dialect = postgres or mysql
如果 postgres 则 schema 必填

- code

```json
{
  "scripts":{
    "code": "wzc-generator-gql-typeorm"
  }
}
```
