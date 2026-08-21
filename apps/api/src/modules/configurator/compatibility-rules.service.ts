import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Rule } from '@rgi/types';
import { DEFAULT_RULES } from '@rgi/config-engine';
import {
  CompatibilityRule,
  type CompatibilityRuleDocument,
} from '../../schemas/compatibility-rule.schema';

/** Rules change rarely and are read on every keystroke in the builder — cache briefly. */
const CACHE_TTL_MS = 30_000;

@Injectable()
export class CompatibilityRulesService {
  private cache: { at: number; rules: Rule[] } | null = null;

  constructor(
    @InjectModel(CompatibilityRule.name)
    private readonly model: Model<CompatibilityRuleDocument>,
  ) {}

  static toRule(doc: CompatibilityRuleDocument): Rule {
    return {
      id: doc.ruleId,
      description: doc.description,
      type: doc.type,
      left: doc.left,
      right: doc.right,
      sumSlots: doc.sumSlots,
      sumAttr: doc.sumAttr,
      factor: doc.factor,
      baseAllowance: doc.baseAllowance,
      severity: doc.severity,
      messageFr: doc.messageFr,
      isActive: doc.isActive,
    };
  }

  /**
   * The rules the engine evaluates. Compatibility is data (CLAUDE.md §6): the collection
   * wins. `DEFAULT_RULES` is only the fallback for a database that has not been seeded —
   * an empty collection must never mean "everything is compatible".
   */
  async activeRules(): Promise<Rule[]> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL_MS) return this.cache.rules;
    const docs = await this.model.find().exec();
    const rules = docs.length
      ? docs.map((d) => CompatibilityRulesService.toRule(d))
      : DEFAULT_RULES;
    this.cache = { at: Date.now(), rules };
    return rules;
  }

  async findAll(): Promise<Rule[]> {
    const docs = await this.model.find().sort({ ruleId: 1 }).exec();
    return docs.map((d) => CompatibilityRulesService.toRule(d));
  }

  async update(id: string, patch: Partial<Rule>): Promise<Rule> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Identifiant invalide.');
    const { id: _ignored, ...rest } = patch;
    const doc = await this.model.findByIdAndUpdate(id, rest, { new: true }).exec();
    if (!doc) throw new NotFoundException('Règle introuvable.');
    this.cache = null;
    return CompatibilityRulesService.toRule(doc);
  }

  invalidate(): void {
    this.cache = null;
  }
}
