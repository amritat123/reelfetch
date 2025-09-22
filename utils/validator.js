const Joi = require('joi');

// Username validation schema
const usernameSchema = Joi.string()
  .alphanum()
  .min(1)
  .max(30)
  .pattern(/^[a-zA-Z0-9._]+$/)
  .required()
  .messages({
    'string.alphanum': 'Username must contain only alphanumeric characters',
    'string.min': 'Username must be at least 1 character long',
    'string.max': 'Username cannot exceed 30 characters',
    'string.pattern.base': 'Username can only contain letters, numbers, dots, and underscores',
    'any.required': 'Username is required'
  });

// URL validation schema
const urlSchema = Joi.string()
  .uri()
  .pattern(/instagram\.com\/(reel|p)\/[A-Za-z0-9_-]+/)
  .required()
  .messages({
    'string.uri': 'Must be a valid URL',
    'string.pattern.base': 'Must be a valid Instagram reel or post URL',
    'any.required': 'URL is required'
  });

function validateUsername(username) {
    return true
  return usernameSchema.validate(username);
}

function validateUrl(url) {
  return urlSchema.validate(url);
}

function sanitizeUsername(username) {
  if (!username) return '';
  return username.toLowerCase().replace(/[^a-zA-Z0-9._]/g, '');
}

module.exports = {
  validateUsername,
  validateUrl,
  sanitizeUsername
};