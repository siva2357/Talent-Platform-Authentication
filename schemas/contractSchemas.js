const Joi = require("joi");

const createContractSchema = Joi.object({
  contractTitle: Joi.string().trim().min(5).required(),
  estimatedBudget: Joi.number().min(30000).max(75000).required(),
  contractStartDate: Joi.date().iso().required(),
  contractEndDate: Joi.date().iso().greater(Joi.ref('contractStartDate')).required(),
  contractDescription: Joi.string().trim().required(),
  contractType: Joi.string().trim().required(),
  contractSubject: Joi.string().trim().required(),
  status: Joi.string().valid("draft", "open", "in progress", "completed", "closed").default("draft"),
  visibility: Joi.string().valid("public", "private").default("private"),
  currency: Joi.string().trim().default("INR"),
  contractCategory: Joi.string().trim(),
  
});

module.exports = {
  createContractSchema
};

