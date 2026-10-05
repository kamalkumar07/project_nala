/**
 * validate.js — zod-based request validator factory.
 *
 * Usage:
 *   router.post('/foo', validate({ body: MySchema }), handler)
 *   router.get('/foo', validate({ query: MyQuerySchema }), handler)
 *
 * On failure the ZodError is forwarded to the central errorHandler,
 * which formats it as a standard VALIDATION_ERROR response.
 */

/**
 * @param {{ body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemas
 */
export function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (err) {
      next(err); // ZodError → errorHandler
    }
  };
}
