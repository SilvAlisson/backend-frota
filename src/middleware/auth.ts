import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define o segredo ou usa um fallback (não recomendado para produção, mas útil em dev)
// Idealmente, garanta que o .env tenha esta variável
const TOKEN_SECRET = process.env.TOKEN_SECRET;

if (!TOKEN_SECRET) {
  console.warn("AVISO DE SEGURANÇA: TOKEN_SECRET não definido. Usando segredo padrão inseguro.");
}

const SECRET_KEY = TOKEN_SECRET || "default_secret_inseguro_para_dev";

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; role: string };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    console.log('Middleware: Token não encontrado');
    return res.sendStatus(401);
  }

  jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
    if (err) {
       console.log('Middleware: Token inválido ou expirado', err.message);
       if (err.name === 'TokenExpiredError') {
         return res.status(401).json({ error: 'Token expirado. Faça login novamente.' });
       }
       return res.sendStatus(403); 
    }
    req.user = user as { userId: string; role: string };
    // console.log('Middleware: Token verificado:', req.user.userId); // Descomente se quiser logs verbosos
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