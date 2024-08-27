import { ISend } from '../code-generator';
import { pascalCase, tableNameToFileName } from '../utils/helper';

const modelTemplate = ({
  tableName,
  tableComment,
  className,
}: {
  tableName: string;
  tableComment: string;
  className: string;
}) => {
  return `
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ${className} } from '../entities/${tableNameToFileName(tableName)}.entity';
import { ContentService } from '../utils/content-service';

/**
 * ${tableComment}
 */
@Injectable()
export class ${className}Service extends ContentService<${className}> {
  constructor(
    @InjectRepository(${className})
    repository: Repository<${className}>,
  ) {
    super(repository);
  }
}
`;
};

export const send = ({ tableItem }: ISend) => {
  return modelTemplate({
    tableName: tableItem.tableName,
    tableComment: tableItem.tableComment,
    className: pascalCase(tableItem.tableName),
  });
};
