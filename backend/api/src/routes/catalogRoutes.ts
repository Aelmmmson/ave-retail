import { Router } from 'express';
import { CatalogController } from '../controllers/catalogController';
import { authMiddleware } from '../middleware/auth';

export const catalogRouter = Router();

catalogRouter.get('/products', CatalogController.getProducts);
catalogRouter.get('/taxes', CatalogController.getTaxes);
catalogRouter.get('/currencies', CatalogController.getCurrencies);

catalogRouter.use(authMiddleware);
catalogRouter.post('/products', CatalogController.createProduct);
catalogRouter.post('/stock-adjust', CatalogController.adjustStock);
