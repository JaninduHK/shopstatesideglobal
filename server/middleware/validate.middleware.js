import { ApiError } from '../utils/ApiError.js';

export const validate = (schema, source = 'body') => (req, res, next) => {
  const data = req[source];
  const { value, error } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  if (error) {
    const details = error.details.map((d) => ({ path: d.path.join('.'), message: d.message }));
    return next(ApiError.badRequest('Invalid request', details));
  }
  req[source] = value;
  next();
};
