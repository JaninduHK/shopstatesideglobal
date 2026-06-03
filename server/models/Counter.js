import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Atomic sequence counters used for order/request numbers.
const CounterSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  seq: { type: Number, default: 0 },
});

CounterSchema.statics.next = async function (key) {
  const doc = await this.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc.seq;
};

export const Counter = model('Counter', CounterSchema);
