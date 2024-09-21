import { IQueryColumnOut, ISend } from '../code-generator';
import { camelCaseNumber, pascalCase } from '../utils/helper';

/**
 * 全局引用需要清空
 */
const importList = new Set<string>();
/**
 * typeorm 包的 import
 */
const typeormImport = new Set<string>();

/**
 * 不生成的列
 */
const notColumn = [
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
  'created_user',
  'updated_user',
  'created_id',
  'updated_id',
  'deleted_id',
  'i18n',
  'enable_flag',
  'enable_at',
];

/**
 * 获取字段类型
 * @param p
 * @returns
 */
const findTypeTxt = (p: IQueryColumnOut): string => {
  switch (p.dataType) {
    case 'bigint':
    case 'nvarchar':
    case 'varchar':
      return 'string';
    case 'timestamp': // GraphQLTimestamp
    case 'datetime':
      return 'Date';
    case 'int':
    case 'integer':
      return 'number';
    case 'decimal':
    case 'double':
      return 'number';
    case 'boolean':
    case 'tinyint':
      return 'boolean';
    case 'json':
      return 'Object';
    default:
      return 'string';
  }
};

/**
 * 获取字段类型
 * @param p
 * @returns
 */
const findGqlTypeTxt = (p: IQueryColumnOut): string => {
  switch (p.dataType) {
    case 'bigint':
    case 'nvarchar':
    case 'varchar':
      return 'String';
    case 'timestamp': // GraphQLTimestamp
    case 'datetime':
      return 'Date';
    case 'int':
      return 'Int';
    case 'decimal':
    case 'double':
      return 'Float';
    case 'boolean':
    case 'tinyint':
      return 'Boolean';
    case 'json':
      return 'GraphQLJSON';
    default:
      return 'String';
  }
};

/**
 * 根据key生成主外建对象 增加 import
 * @param tableItem
 * @param keyColumnList
 * @param inputCol
 * @returns
 */
const findForeignKey = (columnList: IQueryColumnOut[]): string => {
  // 当前表格列
  const normalColumns = columnList
    .filter((p) => !notColumn.includes(p.columnName))
    .map((p) => {
      // 类型
      const modelPropertyType = findTypeTxt(p);
      const propertyGqlType = findGqlTypeTxt(p);
      // 列名对应的属性名
      const propertyName = camelCaseNumber(p.columnName);
      const comment = p.columnComment || p.columnName;

      // 增加非空判断 true 可空 false 非空
      let notNull = p.isNullable !== 'NO' ? 'true' : 'false';

      return `
  /**
   * ${comment}
   */
  @Field(() => ${propertyGqlType}, { nullable: ${notNull}, description: '${comment}' })
  ${propertyName}: ${modelPropertyType};`;
    })
    .join('');

  return normalColumns;
};

const modelTemplate = ({
  tableComment,
  className,
  columns,
}: {
  tableName: string;
  tableComment: string;
  className: string;
  columns: string;
  listCreateColumns: string;
}) => {
  return `
import { Field, ObjectType } from '@nestjs/graphql';
import { ContentObject } from '../../utils/content-object';

/**
 * ${tableComment}
 */
@ObjectType({ description: '${tableComment}' })
export class ${className}Object  extends ContentObject {
${columns}
}
`;
};

export const send = ({ columnList, tableItem }: ISend) => {
  // 初始化清空
  importList.clear();
  typeormImport.clear();

  const columns = findForeignKey(columnList);
  return modelTemplate({
    tableName: tableItem.tableName,
    tableComment: tableItem.tableComment,
    className: pascalCase(tableItem.tableName),
    columns,
    listCreateColumns: '',
  });
};
