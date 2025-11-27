"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    }
    catch (error) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: error.errors.map((e) => ({ field: e.path[0], message: e.message }))
        });
    }
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map