export function validate(schema) {
  return (req, _res, next) => {
    const errors = [];
    for (const key of Object.keys(schema)) {
      const rules = schema[key];
      const value = req.body[key];
      for (const rule of rules) {
        const error = rule(value, key);
        if (error) {
          errors.push(error);
          break;
        }
      }
    }
    if (errors.length > 0) {
      const err = new Error(errors.join("; "));
      err.status = 400;
      return next(err);
    }
    next();
  };
}

export const required = (value, key) =>
  value === undefined || value === null || value === ""
    ? `${key} is required`
    : null;

export const isEmail = (value, key) =>
  value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? `${key} must be a valid email`
    : null;
