import { connectDatabase } from '../src/config/db.js';
import { Product } from '../src/models/Product.js';

async function main() {
  await connectDatabase();
  const result = await Product.updateMany(
    { $or: [{ unit: { $exists: false } }, { unit: null }, { unit: '' }] },
    { $set: { unit: 'piezas' } }
  );
  console.log(`Actualizados ${result.modifiedCount} productos sin unidad`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


