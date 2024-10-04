import { camelCase } from 'lodash';
import { IQueryColumnOut, IQueryKeyColumnOut, IQueryTableOut, ISend } from '../code-generator';
import { camelCaseNumber, pascalCase, tableNameToFileName } from '../utils/helper';

/**
 * 全局引用需要清空
 */
const importList = new Set<string>();
/**
 * typeorm 包的 import
 */
const typeormImport = new Set<string>();

const gqlTypeImport = new Set<string>();

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
    case 'integer':
      gqlTypeImport.add(', Int ');
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
const findForeignKey = (
  tableItem: IQueryTableOut,
  columnList: IQueryColumnOut[],
  keyColumnList: IQueryKeyColumnOut[]
): [string, string] => {
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

  // 主表 主键 OneToMany
  const listOneToMany = keyColumnList
    .filter(
      (p) => p.tableName !== tableItem.tableName || p.referencedTableName === tableItem.tableName
    )
    .map((p) => {
      importList.add(`
import { Save${pascalCase(p.tableName)}Input } from 'src/${tableNameToFileName(
        p.tableName
      )}/dto/${tableNameToFileName(p.tableName)}.input';`);

      return `
  @Field(() => [Save${pascalCase(p.tableName)}Input], { nullable: true})
  ${camelCase(p.columnName)}${pascalCase(p.tableName)}: [Save${pascalCase(p.tableName)}Input];`;
    }).join(`
      `);

  return [normalColumns, listOneToMany];
};

const modelTemplate = ({
  tableComment,
  className,
  columns,
  createRelations,
}: {
  tableName: string;
  tableComment: string;
  className: string;
  columns: string;
  createRelations: string;
  listCreateColumns: string;
}) => {
  const gqlTypeString = Array.from(gqlTypeImport).join('');
  return `
import { Field, InputType, PartialType${gqlTypeString}} from '@nestjs/graphql';
${Array.from(importList).join(`;
`)}
/**
 * ${tableComment}
 */
@InputType({ description: '新增${tableComment}' })
export class Create${className}Input {
${columns}
}

@InputType({ description: '修改${tableComment}' })
export class Update${className}Input extends PartialType(
  Create${className}Input,
) {
  @Field(() => String)
  id: string;
}

@InputType({ description: '保存${tableComment}' })
export class Save${className}Input extends PartialType(
  Create${className}Input,
) {
  @Field(() => String, { nullable: true, description: 'id' })
  id: string;${createRelations}
}
`;
};

export const send = ({ columnList, tableItem, keyColumnList }: ISend) => {
  // 初始化清空
  importList.clear();
  typeormImport.clear();
  gqlTypeImport.clear();

  const [columns, createRelations] = findForeignKey(tableItem, columnList, keyColumnList);
  return modelTemplate({
    tableName: tableItem.tableName,
    tableComment: tableItem.tableComment,
    className: pascalCase(tableItem.tableName),
    columns,
    createRelations,
    listCreateColumns: '',
  });
};
