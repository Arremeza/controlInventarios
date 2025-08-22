import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { createProduct, listProducts, getProduct, updateProduct, deleteProduct, deliverProduct, listProductDeliveries, updateProductDelivery, requestProduct } from '../controllers/product.controller.js';

const router = Router();

// Todas requieren autenticación
router.use(authenticate);

router.get('/', listProducts);
router.get('/:id', getProduct);
router.get('/:id/deliveries', authorize(['admin']), listProductDeliveries);

// Solo admin puede crear/editar/eliminar y ver cantidades completas
router.post('/', authorize(['admin']), createProduct);
router.put('/:id', authorize(['admin']), updateProduct);
router.delete('/:id', authorize(['admin']), deleteProduct);
router.post('/:id/deliver', authorize(['admin']), deliverProduct);
router.put('/:id/deliveries/:deliveryId', authorize(['admin']), updateProductDelivery);
router.post('/:id/request', requestProduct);

export default router;


