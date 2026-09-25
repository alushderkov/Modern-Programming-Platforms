import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

sessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

export type SessionDocument = InferSchemaType<typeof sessionSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Session = model('Session', sessionSchema);
