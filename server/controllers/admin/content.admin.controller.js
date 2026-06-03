import mongoose from 'mongoose';
import { Article } from '../../models/Article.js';
import { FAQItem } from '../../models/FAQItem.js';
import { ApiError } from '../../utils/ApiError.js';
import { ok, created, noContent } from '../../utils/ApiResponse.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { uniqueSlug } from '../../utils/slug.js';

// --- Articles ---

export const listArticles = catchAsync(async (req, res) => {
  const list = await Article.find({ deletedAt: null })
    .sort({ publishedAt: -1, createdAt: -1 })
    .lean();
  return ok(res, { articles: list });
});

export const getArticle = catchAsync(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw ApiError.badRequest('Bad id');
  const article = await Article.findOne({ _id: req.params.id, deletedAt: null });
  if (!article) throw ApiError.notFound('Article not found');
  return ok(res, { article });
});

export const createArticle = catchAsync(async (req, res) => {
  const slug = await uniqueSlug(Article, req.body.title);
  const article = await Article.create({
    ...req.body,
    slug,
    author: req.user._id,
    publishedAt: req.body.isPublished ? new Date() : undefined,
  });
  return created(res, { article });
});

export const updateArticle = catchAsync(async (req, res) => {
  const article = await Article.findOne({ _id: req.params.id, deletedAt: null });
  if (!article) throw ApiError.notFound('Article not found');
  if (req.body.title && req.body.title !== article.title) {
    article.slug = await uniqueSlug(Article, req.body.title, { ignoreId: article._id });
  }
  Object.assign(article, req.body);
  if (req.body.isPublished && !article.publishedAt) article.publishedAt = new Date();
  await article.save();
  return ok(res, { article });
});

export const deleteArticle = catchAsync(async (req, res) => {
  const article = await Article.findOne({ _id: req.params.id, deletedAt: null });
  if (!article) throw ApiError.notFound('Article not found');
  article.deletedAt = new Date();
  article.isPublished = false;
  await article.save();
  return noContent(res);
});

// --- FAQ ---

export const listFAQ = catchAsync(async (req, res) => {
  const list = await FAQItem.find({}).sort({ section: 1, sortOrder: 1 }).lean();
  return ok(res, { items: list });
});

export const createFAQ = catchAsync(async (req, res) => {
  const item = await FAQItem.create(req.body);
  return created(res, { item });
});

export const updateFAQ = catchAsync(async (req, res) => {
  const item = await FAQItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) throw ApiError.notFound('FAQ not found');
  return ok(res, { item });
});

export const deleteFAQ = catchAsync(async (req, res) => {
  await FAQItem.findByIdAndDelete(req.params.id);
  return noContent(res);
});
