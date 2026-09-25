import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const passwordResetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type PasswordResetDocument = InferSchemaType<typeof passwordResetSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const PasswordReset = model('PasswordReset', passwordResetSchema);
