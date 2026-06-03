import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ArticleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    excerpt: { type: String, maxlength: 280 },
    body: { type: String, default: '' }, // HTML / rich text
    coverImage: { url: String, publicId: String },
    tags: [String],

    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: Date,
    author: { type: Schema.Types.ObjectId, ref: 'User' },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ArticleSchema.index({ isPublished: 1, publishedAt: -1 });

export const Article = model('Article', ArticleSchema);
