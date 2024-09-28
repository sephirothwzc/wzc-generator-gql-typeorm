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

- code

```json
{
  "scripts":{
    "code": "wzc-generator-gql-typeorm"
  }
}
```
