import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Garantia de segurança: O servidor já teria crashado no index.ts se isso não existisse,
// mas o TypeScript precisa de saber que é string.
const SECRET_KEY = process.env.TOKEN_SECRET!;

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; role: string };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
      }
      return res.status(403).json({ error: 'Token inválido.' });
    }
    req.user = user as { userId: string; role: string };
    next();
  });
};

export const authorize = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.sendStatus(401);
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado: Permissões insuficientes.' });
    }
    next();
  };
};