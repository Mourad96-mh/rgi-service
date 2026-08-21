import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { Role } from '@rgi/types';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: false })
export class Address {
  @Prop()
  label?: string;

  @Prop({ required: true })
  line1!: string;

  @Prop()
  line2?: string;

  @Prop({ required: true })
  city!: string;

  @Prop()
  region?: string;

  @Prop()
  postalCode?: string;

  @Prop({ required: true })
  phone!: string;

  @Prop({ default: false })
  isDefault!: boolean;
}
export const AddressSchema = SchemaFactory.createForClass(Address);

/** DATA_MODEL.md §6. `passwordHash` and `refreshTokenHash` never leave the server. */
@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ required: true, enum: ['customer', 'staff', 'admin'], default: 'customer' })
  role!: Role;

  @Prop({ type: [AddressSchema], default: [] })
  addresses!: Address[];

  /** Hash of the current refresh token — logout and rotation invalidate it. */
  @Prop({ select: false })
  refreshTokenHash?: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
