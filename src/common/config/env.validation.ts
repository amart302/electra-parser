import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),

  TARGET_URL: Joi.string().uri().required(),
});
