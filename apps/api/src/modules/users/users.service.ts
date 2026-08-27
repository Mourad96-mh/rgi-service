import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Address, User as UserDto } from '@rgi/types';
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

  /**
   * Save a profile edit. Only the fields the DTO allows can reach this, and an absent
   * field means "leave it alone" rather than "clear it" — a form that only changes the
   * phone must not wipe the name.
   */
  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string },
  ): Promise<UserDocument> {
    const user = await this.getByIdOrFail(userId);
    if (data.name !== undefined) user.name = data.name.trim();
    if (data.phone !== undefined) user.phone = data.phone.trim();
    await user.save();
    return user;
  }

  /**
   * Replace the whole address book (see `UpdateAddressesDto` for why wholesale).
   *
   * The default is normalised here rather than trusted from the client, because checkout
   * reads it to preselect a delivery address: two defaults would make that arbitrary and
   * zero defaults would silently preselect nothing.
   */
  async replaceAddresses(userId: string, addresses: Address[]): Promise<UserDocument> {
    const user = await this.getByIdOrFail(userId);
    user.addresses = UsersService.withOneDefault(addresses);
    await user.save();
    return user;
  }

  /**
   * Exactly one default in a non-empty book: the one the client marked, the first if it
   * marked several, and the first entry if it marked none. Pure — unit-tested.
   */
  static withOneDefault(addresses: Address[]): Address[] {
    if (!addresses.length) return [];
    const firstMarked = addresses.findIndex((address) => address.isDefault);
    const defaultIndex = firstMarked === -1 ? 0 : firstMarked;
    return addresses.map((address, index) => ({
      ...address,
      isDefault: index === defaultIndex,
    }));
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
