import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AttributeDefinition as AttributeDefinitionDto, Attributes } from '@rgi/types';
import {
  AttributeDefinition,
  type AttributeDefinitionDocument,
} from '../../schemas/attribute-definition.schema';
import type {
  CreateAttributeDefinitionDto,
  UpdateAttributeDefinitionDto,
} from './dto/attribute-definition.dto';

@Injectable()
export class AttributeDefinitionsService {
  constructor(
    @InjectModel(AttributeDefinition.name)
    private readonly model: Model<AttributeDefinitionDocument>,
  ) {}

  static toDto(doc: AttributeDefinitionDocument): AttributeDefinitionDto {
    return {
      id: doc._id.toString(),
      categoryType: doc.categoryType,
      key: doc.key,
      label: { fr: doc.label.fr, ar: doc.label.ar },
      dataType: doc.dataType,
      unit: doc.unit,
      enumValues: doc.enumValues,
      multiple: doc.multiple,
      required: doc.required,
      filterable: doc.filterable,
      usedInCompatibility: doc.usedInCompatibility,
      order: doc.order,
    };
  }

  async findByCategoryType(categoryType: string): Promise<AttributeDefinitionDto[]> {
    const docs = await this.model.find({ categoryType }).sort({ order: 1 }).exec();
    return docs.map((d) => AttributeDefinitionsService.toDto(d));
  }

  async findAll(): Promise<AttributeDefinitionDto[]> {
    const docs = await this.model.find().sort({ categoryType: 1, order: 1 }).exec();
    return docs.map((d) => AttributeDefinitionsService.toDto(d));
  }

  async create(dto: CreateAttributeDefinitionDto): Promise<AttributeDefinitionDto> {
    const exists = await this.model.exists({
      categoryType: dto.categoryType,
      key: dto.key,
    });
    if (exists) {
      throw new BadRequestException(
        `L'attribut "${dto.key}" existe déjà pour le type "${dto.categoryType}".`,
      );
    }
    if (dto.dataType === 'enum' && !dto.enumValues?.length) {
      throw new BadRequestException(
        'Un attribut de type "enum" doit lister ses valeurs possibles.',
      );
    }
    const doc = await this.model.create(dto);
    return AttributeDefinitionsService.toDto(doc);
  }

  async update(
    id: string,
    dto: UpdateAttributeDefinitionDto,
  ): Promise<AttributeDefinitionDto> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Identifiant invalide.');
    const doc = await this.model.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!doc) throw new NotFoundException('Attribut introuvable.');
    return AttributeDefinitionsService.toDto(doc);
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Identifiant invalide.');
    const res = await this.model.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Attribut introuvable.');
  }

  /**
   * Validate a product's `attributes` against the definitions of its category type
   * (ADMIN_DASHBOARD.md §2): required fields present, correct types, strict enum values,
   * and no unknown keys. A typo'd socket would silently break the configurator, so this
   * runs server-side on every write — never only in the browser.
   */
  async validateAttributes(
    categoryType: string,
    attributes: Attributes | undefined,
    { partial = false }: { partial?: boolean } = {},
  ): Promise<Attributes> {
    const defs = await this.model.find({ categoryType }).exec();
    const input = attributes ?? {};
    const errors: string[] = [];
    const known = new Set(defs.map((d) => d.key));

    for (const key of Object.keys(input)) {
      if (!known.has(key)) {
        errors.push(`Attribut inconnu pour cette catégorie : "${key}".`);
      }
    }

    const out: Attributes = {};
    for (const def of defs) {
      const raw = input[def.key];
      const missing = raw === undefined || raw === null || raw === '';

      if (missing) {
        if (def.required && !partial) {
          errors.push(`L'attribut "${def.label.fr}" est obligatoire.`);
        }
        continue;
      }

      if (def.multiple) {
        const list = Array.isArray(raw) ? raw : [raw];
        const values = list.map((v) => String(v));
        if (def.dataType === 'enum') {
          const bad = values.filter((v) => !(def.enumValues ?? []).includes(v));
          if (bad.length) {
            errors.push(
              `Valeur invalide pour "${def.label.fr}" : ${bad.join(', ')}. ` +
                `Valeurs autorisées : ${(def.enumValues ?? []).join(', ')}.`,
            );
            continue;
          }
        }
        out[def.key] = values;
        continue;
      }

      switch (def.dataType) {
        case 'number': {
          const num = typeof raw === 'number' ? raw : Number(raw);
          if (!Number.isFinite(num)) {
            errors.push(`L'attribut "${def.label.fr}" doit être un nombre.`);
          } else {
            out[def.key] = num;
          }
          break;
        }
        case 'boolean': {
          if (typeof raw === 'boolean') out[def.key] = raw;
          else if (raw === 'true' || raw === 'false') out[def.key] = raw === 'true';
          else errors.push(`L'attribut "${def.label.fr}" doit être vrai ou faux.`);
          break;
        }
        case 'enum': {
          const value = String(raw);
          if (!(def.enumValues ?? []).includes(value)) {
            errors.push(
              `Valeur invalide pour "${def.label.fr}" : "${value}". ` +
                `Valeurs autorisées : ${(def.enumValues ?? []).join(', ')}.`,
            );
          } else {
            out[def.key] = value;
          }
          break;
        }
        default:
          out[def.key] = String(raw);
      }
    }

    if (errors.length) throw new BadRequestException(errors);
    return out;
  }
}
