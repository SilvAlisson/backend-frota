import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
export declare const validate: (schema: ZodType<any, any>) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=validate.d.ts.map