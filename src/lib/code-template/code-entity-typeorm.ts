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
 * 根据key生成主外建对象 增加 import
 * @param tableItem
 * @param keyColumnList
 * @param inputCol
 * @returns
 */
const findForeignKey = (
  columnList: IQueryColumnOut[],
  tableItem: IQueryTableOut,
  keyColumnList: IQueryKeyColumnOut[]
): [string, string] => {
  // 当前表格列
  const normalColumns = columnList
    .filter((p) => !notColumn.includes(p.columnName))
    .map((p) => {
      // 类型
      const modelPropertyType = findTypeTxt(p);
      // 列名对应的属性名
      const propertyName = camelCaseNumber(p.columnName);
      const comment = p.columnComment || p.columnName;
      // 判断长度 增加长度限制
      let maxValid = '';
      if (modelPropertyType === 'string') {
        maxValid = `
        length:${p.characterMaximumLength || 50},`;
      }
      // 增加非空判断
      let notNull = p.isNullable !== 'NO' ? 'false' : 'true';

      return `
  /**
   * ${comment}
   */
  @Column({
      name: '${p.columnName}',
      nullable: ${notNull},
      comment: '${comment}',${maxValid}
    })
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
import { ${pascalCase(p.tableName)} } from './${tableNameToFileName(p.tableName)}.entity';`);
      typeormImport.add(`, OneToMany`);

      return `
  /**
   * ${pascalCase(p.columnName)}-${p.tablecomment}
   */
  @OneToMany(() => ${pascalCase(p.tableName)}, (${camelCase(p.tableName)}) => ${camelCase(
        p.tableName
      )}.${camelCase(p.referencedColumnName)}${pascalCase(p.referencedTableName)})
  ${camelCase(p.columnName)}${pascalCase(p.tableName)}: Array<${pascalCase(p.tableName)}>;`;
    })
    .join(``);

  /**
   * 子表 外键 ManyToOne
   */
  const listManyToOne = keyColumnList
    .filter((p) => p.tableName === tableItem.tableName)
    .map((p) => {
      importList.add(`
import { ${pascalCase(p.referencedTableName)} } from './${tableNameToFileName(
        p.referencedTableName
      )}.entity';`);
      typeormImport.add(`, JoinColumn, ManyToOne`);

      return `
  /**
   * ${pascalCase(p.columnName)}-${p.reftablecomment}
   */
    @ManyToOne(() => ${pascalCase(p.referencedTableName)}, (${camelCase(
        p.referencedTableName
      )}) => ${camelCase(p.referencedTableName)}.${camelCase(p.columnName)}${pascalCase(
        p.tableName
      )}, {
    onDelete: '${p.deleterule}',
    onUpdate: '${p.updaterule}',
  })
  @JoinColumn([{ name: '${p.columnName}', referencedColumnName: '${p.referencedColumnName}' }])
  ${camelCase(p.columnName)}${pascalCase(p.referencedTableName)}: ${pascalCase(
        p.referencedTableName
      )};`;
    })
    .join(``);

  const listCreateColumns = [listManyToOne, listOneToMany].filter((p) => p).join(``);

  return [normalColumns, listCreateColumns];
};

const modelTemplate = ({
  tableName,
  tableComment,
  className,
  columns,
  listCreateColumns,
}: {
  tableName: string;
  tableComment: string;
  className: string;
  columns: string;
  listCreateColumns: string;
}) => {
  const importStr = Array.from(importList).join(``);
  const typeormImportStr = Array.from(typeormImport).join('');
  return `
import { Column, Entity${typeormImportStr} } from 'typeorm';

import { ContentEntity } from '../utils/content-entity';
${importStr}

/**
 * ${tableComment}
 */
@Entity('${tableName}')
export class ${className} extends ContentEntity {
${columns}
${listCreateColumns}
}
`;
};

export const send = ({ columnList, tableItem, keyColumnList }: ISend) => {
  // 初始化清空
  importList.clear();
  typeormImport.clear();

  const [columns, listCreateColumns] = findForeignKey(columnList, tableItem, keyColumnList);
  return modelTemplate({
    tableName: tableItem.tableName,
    tableComment: tableItem.tableComment,
    className: pascalCase(tableItem.tableName),
    columns,
    listCreateColumns,
  });
};
