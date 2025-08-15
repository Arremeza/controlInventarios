import { connectDatabase } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { env } from '../src/config/env.js';

async function main() {
  await connectDatabase();
  const email = env.adminEmail;
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({
      name: 'Administrador',
      email,
      password: env.adminPassword,
      role: 'admin',
      isSeedAdmin: true
    });
    console.log('Administrador creado:', email);
  } else {
    console.log('Administrador ya existe:', email);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


