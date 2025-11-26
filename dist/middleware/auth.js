"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Garantia de segurança: O servidor já teria crashado no index.ts se isso não existisse,
// mas o TypeScript precisa de saber que é string.
const SECRET_KEY = process.env.TOKEN_SECRET;
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        return res.status(401).json({ error: 'Token não fornecido.' });
    }
    jsonwebtoken_1.default.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
            }
            return res.status(403).json({ error: 'Token inválido.' });
        }
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user)
            return res.sendStatus(401);
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Acesso negado: Permissões insuficientes.' });
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.js.map