import { Router } from 'express';
import { ManutencaoController } from '../controllers/ManutencaoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { manutencaoSchema } from '../schemas/operacao.schemas';

const router = Router();
router.use(authenticateToken);

// Criar Manutenção
router.post('/', validate(manutencaoSchema), ManutencaoController.create);

// Editar Manutenção
router.put('/:id', validate(manutencaoSchema), ManutencaoController.update);

// Listar Recentes
router.get('/recentes', ManutencaoController.listRecent);

// Remover Manutenção
router.delete('/:id', ManutencaoController.delete);

export default router;