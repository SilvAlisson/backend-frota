"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => async (req, res, next) => {
    try {
        // 1. Validação assíncrona
        const result = await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        if (result.body) {
            Object.assign(req.body, result.body);
        }
        if (result.query) {
            Object.assign(req.query, result.query);
        }
        if (result.params) {
            Object.assign(req.params, result.params);
        }
        return next();
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            const errorMessages = error.issues.map((issue) => {
                const path = issue.path.join('.').replace(/^(body|query|params)\./, '');
                return { field: path, message: issue.message };
            });
            return res.status(400).json({
                error: 'Dados inválidos',
                details: errorMessages
            });
        }
        console.error("Validation error:", error);
        return res.status(500).json({ error: 'Erro interno de validação' });
    }
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map