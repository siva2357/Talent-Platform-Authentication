const Joi = require("joi");

const createContractSchema = Joi.object({
  contractTitle: Joi.string().trim().min(5).required(),
  estimatedBudget: Joi.number().min(30000).max(75000).required(),
  contractStartDate: Joi.date().iso().required(),
  contractEndDate: Joi.date().iso().greater(Joi.ref('contractStartDate')).required(),
  contractDescription: Joi.string().trim().required(),
  contractType: Joi.string().trim().required(),
  contractSubject: Joi.string().trim().required(),
  status: Joi.string().valid("pending", "in progress", "completed").default("pending")
});

module.exports = {
  createContractSchema
};
