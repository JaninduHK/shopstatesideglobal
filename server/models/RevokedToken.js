import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const RevokedTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL: documents removed automatically once expiresAt passes
RevokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RevokedToken = model('RevokedToken', RevokedTokenSchema);
