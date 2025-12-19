import { Router } from 'express';
import { ManutencaoController } from '../controllers/ManutencaoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { manutencaoSchema } from '../schemas/operacao.schemas';

const router = Router();
const manutencaoController = new ManutencaoController();

router.use(authenticateToken);

// Criar Manutenção
router.post('/', validate(manutencaoSchema), manutencaoController.create);

// Editar Manutenção
router.put('/:id', validate(manutencaoSchema), manutencaoController.update);

// Listar Recentes
router.get('/recentes', manutencaoController.listRecent);

// Remover Manutenção
router.delete('/:id', manutencaoController.delete);

export default router;