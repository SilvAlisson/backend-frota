import { Request, Response } from 'express';
export declare class VeiculoController {
    static create(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static list(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static update(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static delete(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=VeiculoController.d.ts.map