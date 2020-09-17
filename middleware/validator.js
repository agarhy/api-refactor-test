const { body, validationResult } = require('express-validator')

const signupValidationRules = () => {
  return [
    // Email field validation
    body('email').notEmpty(),
    // Username field validation
    body('username').notEmpty(),
    // Password field validation
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be 6 Characters at least')
      .notEmpty().withMessage('Password can not be empty')
      .custom((value, { req, loc, path }) => {
        if (value !== req.body.confirmPassword) {
          // trow error if passwords do not match
          throw new Error("Passwords don't match");
        } else {
          return value;
        }
      }).withMessage('Password does not match must be 4 Characters at least')
  ]
}

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (errors.isEmpty()) {
    return next()
  }
  const extractedErrors = []
  errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }))

  return res.status(422).json({
    errors: extractedErrors,
  })
}

module.exports = {
  signupValidationRules,
  validate,
}