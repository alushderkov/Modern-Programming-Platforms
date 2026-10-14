import { Schema, model, type InferSchemaType } from 'mongoose';
import { FILM_STATUSES } from '../types';

const posterSchema = new Schema(
  {
    storedName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
);

const filmSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    director: { type: String, required: true, trim: true },
    year: { type: Number, default: null },
    status: { type: String, enum: FILM_STATUSES, default: 'planned' },
    rating: { type: Number, default: null },
    notes: { type: String, default: '' },
    poster: { type: posterSchema, default: null },
  },
  { timestamps: true },
);

export type FilmDocument = InferSchemaType<typeof filmSchema> & {
  _id: { toString(): string };
  createdAt: Date;
  updatedAt: Date;
};

export const Film = model('Film', filmSchema);
