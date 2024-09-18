import { camelCase } from 'lodash';
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
const graphqlImport = new Set();
const resolveService = new Set();

const modelTemplate = ({
  tableName,
  tableComment,
  className,
  importStr,
  listOneToMany,
  listManyToOne,
}: {
  tableName: string;
  tableComment: string;
  className: string;
  importStr: string;
  listOneToMany: string;
  listManyToOne: string;
}) => {
  let importGqlStr = Array.from(graphqlImport).join(', ');
  if (importGqlStr) {
    importGqlStr = ', ' + importGqlStr;
  }
  let servicesInject = Array.from(resolveService).join(', ');
  if (servicesInject) {
    servicesInject = ', ' + servicesInject;
  }
  return `
import { Args, Info, Int, Mutation, Query, Resolver${importGqlStr} } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import { UseGuards } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';

import { CurrentUser } from '../auth/dto/current-user';
import { ${className} } from '../entities/${tableNameToFileName(tableName)}.entity';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { JwtAuthEntity } from '../auth/jwt-auth-entity';
import { QueryBuilderOptionsInput } from '../utils/resolver-input';
import {
  Create${className}Input,
  Save${className}Input,
  Update${className}Input,
} from './dto/${tableNameToFileName(tableName)}.input';
import { ${className}Object } from './model/${tableNameToFileName(tableName)}.object';
import { ${className}Service } from './${tableNameToFileName(tableName)}.service';
${importStr}

/**
 * ${tableComment}
 */
@Resolver(() => ${className}Object)
export class ${className}Resolver {
  constructor(private readonly ${camelCase(
    tableName
  )}Service: ${className}Service${servicesInject}) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [${className}Object], { description: '查询用户' })
  async find${className}(
    @Args('queryBuilderOptions') queryBuilderOptions: QueryBuilderOptionsInput<${className}>,
    @CurrentUser() user: JwtAuthEntity
  ) {
    return this.${camelCase(tableName)}Service.findEntity(queryBuilderOptions, user);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => Int, { description: '获取行数' })
  async find${className}Count(
    @Args('queryBuilderOptions') queryBuilderOptions: QueryBuilderOptionsInput<${className}>,
    @CurrentUser() user: JwtAuthEntity) {
    return this.${camelCase(tableName)}Service.count(queryBuilderOptions.where, user);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => ${className}Object, { description: '根据id获取' })
  async find${className}ByPk(
    @Args('id', { type: () => String }) id: string,
    @CurrentUser() user: JwtAuthEntity) {
    return this.${camelCase(tableName)}Service.findByPk(id, user);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ${className}Object, { description: '根据id保存用户' })
  async save${className}(
    @Args('save${className}Input') save${className}Input: Save${className}Input,
    @CurrentUser() user: JwtAuthEntity,
  ) {
    return this.${camelCase(tableName)}Service.save(save${className}Input, user);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ${className}Object, { description: '新增用户' })
  async create${className}(@Args('create${className}Input') create${className}Input: Create${className}Input,
  @CurrentUser() user: JwtAuthEntity) {
    return this.${camelCase(tableName)}Service.create(create${className}Input, user);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ${className}Object)
  async update${className}(
    @Args('update${className}Input') update${className}Input: Update${className}Input,
    @CurrentUser() user: JwtAuthEntity) {
    return this.${camelCase(
      tableName
    )}Service.update(update${className}Input.id, update${className}Input, user);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Int)
  async remove${className}(
    @Args('id', { type: () => String }) id: string,
    @CurrentUser() user: JwtAuthEntity) {
    return this.${camelCase(tableName)}Service.remove(id, user);
  }
  ${listOneToMany}${listManyToOne}
}
`;
};

/**
 * 获取主外键的对象
 * @param keyColumnList
 */
const findResolveField = (
  tableItem: IQueryTableOut,
  keyColumnList: IQueryKeyColumnOut[]
): [string, string, string] => {
  const importList = new Set();
  // 主表 主键 OneToMany
  const listOneToMany = keyColumnList
    .filter(
      (p) => p.tableName !== tableItem.tableName || p.referencedTableName === tableItem.tableName
    )
    .map((p) => {
      graphqlImport.add('ResolveField');
      graphqlImport.add('Parent');
      resolveService.add(
        `private readonly ${camelCase(p.tableName)}Service: ${pascalCase(p.tableName)}Service`
      );

      importList.add(`
import { ${pascalCase(p.tableName)}Object } from '../${tableNameToFileName(
        p.tableName
      )}/model/${tableNameToFileName(p.tableName)}.object';`);
      importList.add(
        `import { ${pascalCase(p.tableName)}Service } from '../${tableNameToFileName(
          p.tableName
        )}/${tableNameToFileName(p.tableName)}.service';`
      );
      importList.add(`
import { merge } from 'lodash';
`);
      importList.add(`
import { ${pascalCase(p.tableName)} } from '../entities/${tableNameToFileName(p.tableName)}.entity';
`);

      return `
  @ResolveField(() => [${pascalCase(p.tableName)}Object], { nullable: true })
  async ${camelCase(p.tableName)}(@Parent() ${camelCase(p.referencedTableName)}Object: ${pascalCase(
        p.referencedTableName
      )}Object,
      @Info() { info }, // Type of the object that implements Character
      @Args('param', {
        type: () => GraphQLJSON,
        nullable: true,
      })
      param: QueryBuilderOptionsInput<${pascalCase(p.tableName)}>) {
    const { id } =  ${camelCase(p.referencedTableName)}Object;
    const queryBuilderOptions = merge({}, param, {
      where: { ${camelCase(p.columnName)}: id } as
        | FindOptionsWhere<${pascalCase(p.tableName)}>[]
        | FindOptionsWhere<${pascalCase(p.tableName)}>,
    });
    return this.${camelCase(p.tableName)}Service.findEntity(queryBuilderOptions);
  }`;
    })
    .join(``);

  /**
   * 子表 外键 ManyToOne
   */
  const listManyToOne = keyColumnList
    .filter((p) => p.tableName === tableItem.tableName)
    .map((p) => {
      graphqlImport.add('ResolveField');
      graphqlImport.add('Parent');
      resolveService.add(
        `private readonly ${camelCase(p.referencedTableName)}Service: ${pascalCase(
          p.referencedTableName
        )}Service`
      );

      importList.add(`
import { ${pascalCase(p.referencedTableName)}Object } from '../${tableNameToFileName(
        p.referencedTableName
      )}/model/${tableNameToFileName(p.referencedTableName)}.object';`);
      importList.add(
        `import { ${pascalCase(p.referencedTableName)}Service } from '../${tableNameToFileName(
          p.referencedTableName
        )}/${tableNameToFileName(p.referencedTableName)}.service';`
      );
      return `
  @ResolveField(() => ${pascalCase(p.referencedTableName)}Object, { nullable: true })
  async ${camelCase(p.referencedTableName)}(@Parent() ${camelCase(p.tableName)}Object: ${pascalCase(
        p.tableName
      )}Object) {
    const { ${camelCase(p.columnName)} } = ${camelCase(p.tableName)}Object;
    if(!${camelCase(p.columnName)}){
      return {};  
    }
    return this.${camelCase(p.referencedTableName)}Service.findByPk(${camelCase(p.columnName)});
  }`;
    })
    .join(``);

  const importStr = Array.from(importList).join(`
`);
  return [importStr, listOneToMany, listManyToOne];
};

export const send = ({ tableItem, keyColumnList }: ISend) => {
  graphqlImport.clear();
  resolveService.clear();
  // 获取 主外键的 ResolveField
  const [importStr, listOneToMany, listManyToOne] = findResolveField(tableItem, keyColumnList);
  return modelTemplate({
    tableName: tableItem.tableName,
    tableComment: tableItem.tableComment,
    className: pascalCase(tableItem.tableName),
    importStr,
    listOneToMany,
    listManyToOne,
  });
};
