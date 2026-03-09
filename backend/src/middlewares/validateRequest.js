const validateRequest = (schema) => (req, res, next) => {
  const parse = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query
  });

  if (!parse.success) {
    return res.status(400).render('errors/400', {
      title: 'Validation Error',
      errors: parse.error.issues
    });
  }

  req.validated = parse.data;
  return next();
};

module.exports = validateRequest;
