import { IQueryKeyColumnOut, IQueryTableOut, ISend } from '../code-generator';
import { pascalCase, tableNameToFileName } from '../utils/helper';

/**
 * import {
  Args,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
 */
const typeormImport = new Set();
const servicesImport = new Set();

const modelTemplate = ({
  tableName,
  tableComment,
  className,
  importStr,
}: {
  tableName: string;
  tableComment: string;
  className: string;
  importStr: string;
}) => {
  let typeormStr = Array.from(typeormImport).join(', ');
  if (typeormStr) {
    typeormStr = ', ' + typeormStr;
  }
  let servicesInject = Array.from(servicesImport).join(', ');
  if (servicesInject) {
    servicesInject = ', ' + servicesInject;
  }
  return `
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ${className} } from '../entities/${tableNameToFileName(tableName)}.entity';
import { ${className}Resolver } from './${tableNameToFileName(tableName)}.resolver';
import { ${className}Service } from './${tableNameToFileName(tableName)}.service';
${importStr}

/**
 * ${tableComment}
 */
@Module({
  imports: [TypeOrmModule.forFeature([${className}${typeormStr}])],
  providers: [${className}Resolver, ${className}Service${servicesInject}],
})
export class ${className}Module {}
`;
};

/**
 * 获取主外键的对象
 * @param keyColumnList
 */
const findResolveField = (
  tableItem: IQueryTableOut,
  keyColumnList: IQueryKeyColumnOut[]
): string => {
  const importList = new Set();
  // 主表 主键 OneToMany
  keyColumnList
    .filter(
      (p) => p.tableName !== tableItem.tableName || p.referencedTableName === tableItem.tableName
    )
    .forEach((p) => {
      importList.add(`
import { ${pascalCase(p.tableName)} } from '../entities/${tableNameToFileName(
        p.tableName
      )}.entity'`);
      importList.add(
        `import { ${pascalCase(p.tableName)}Service } from '../${tableNameToFileName(
          p.tableName
        )}/${tableNameToFileName(p.tableName)}.service';`
      );
      typeormImport.add(pascalCase(p.tableName));
      servicesImport.add(`${pascalCase(p.tableName)}Service`);
    });

  /**
   * 子表 外键 ManyToOne
   */
  keyColumnList
    .filter((p) => p.tableName === tableItem.tableName)
    .forEach((p) => {
      importList.add(`
import { ${pascalCase(p.referencedTableName)} } from '../entities/${tableNameToFileName(
        p.referencedTableName
      )}.entity'`);
      importList.add(
        `import { ${pascalCase(p.referencedTableName)}Service } from '../${tableNameToFileName(
          p.referencedTableName
        )}/${tableNameToFileName(p.referencedTableName)}.service';`
      );
      typeormImport.add(pascalCase(p.referencedTableName));
      servicesImport.add(`${pascalCase(p.referencedTableName)}Service`);
    });

  const importStr = Array.from(importList).join(`
`);
  return importStr;
};

export const send = ({ tableItem, keyColumnList }: ISend) => {
  typeormImport.clear();
  servicesImport.clear();
  // 获取 主外键的 ResolveField
  const importStr = findResolveField(tableItem, keyColumnList);
  return modelTemplate({
    tableName: tableItem.tableName,
    tableComment: tableItem.tableComment,
    className: pascalCase(tableItem.tableName),
    importStr,
  });
};
