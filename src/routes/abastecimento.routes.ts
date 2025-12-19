import { Router } from 'express';
import { AbastecimentoController } from '../controllers/AbastecimentoController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { abastecimentoSchema } from '../schemas/operacao.schemas';

const router = Router();
const abastecimentoController = new AbastecimentoController();

router.use(authenticateToken);

// 2. Usamos a instância nas rotas:

router.post('/',
    validate(abastecimentoSchema),
    abastecimentoController.create
);

router.get('/recentes', abastecimentoController.listRecent);

router.delete('/:id', abastecimentoController.delete);

export default router;