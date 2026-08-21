import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { User as UserDto } from '@rgi/types';
import { User, type UserDocument } from '../../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  /** The only place a User document becomes an API payload — hashes never get through. */
  static toDto(doc: UserDocument): UserDto {
    return {
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name,
      phone: doc.phone,
      role: doc.role,
      addresses: doc.addresses ?? [],
      isActive: doc.isActive,
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt?.toISOString(),
    };
  }

  findByEmail(email: string, withSecrets = false) {
    const q = this.model.findOne({ email: email.toLowerCase().trim() });
    return withSecrets ? q.select('+passwordHash +refreshTokenHash').exec() : q.exec();
  }

  findById(id: string, withSecrets = false) {
    if (!Types.ObjectId.isValid(id)) return null;
    const q = this.model.findById(id);
    return withSecrets ? q.select('+passwordHash +refreshTokenHash').exec() : q.exec();
  }

  async getByIdOrFail(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return user;
  }

  create(data: Partial<User>) {
    return this.model.create(data);
  }

  async setRefreshTokenHash(userId: string, hash: string | null) {
    await this.model
      .updateOne(
        { _id: userId },
        hash ? { $set: { refreshTokenHash: hash } } : { $unset: { refreshTokenHash: 1 } },
      )
      .exec();
  }
}
