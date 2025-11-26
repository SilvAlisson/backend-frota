import { Router } from 'express';
import { JornadaController } from '../controllers/JornadaController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.post('/iniciar', JornadaController.iniciar);
router.put('/finalizar/:id', JornadaController.finalizar);
router.get('/abertas', JornadaController.listarAbertas);
router.get('/minhas-abertas-operador', JornadaController.listarMinhasAbertas);
router.post('/verificar-timeouts', JornadaController.verificarTimeouts);

export default router;