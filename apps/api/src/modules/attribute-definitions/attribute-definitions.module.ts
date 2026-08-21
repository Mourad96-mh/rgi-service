import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AttributeDefinition,
  AttributeDefinitionSchema,
} from '../../schemas/attribute-definition.schema';
import { AttributeDefinitionsController } from './attribute-definitions.controller';
import { AttributeDefinitionsService } from './attribute-definitions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AttributeDefinition.name, schema: AttributeDefinitionSchema },
    ]),
  ],
  controllers: [AttributeDefinitionsController],
  providers: [AttributeDefinitionsService],
  exports: [AttributeDefinitionsService, MongooseModule],
})
export class AttributeDefinitionsModule {}
