import { db } from './lib/db';
import { settings } from './shared/schema';

async function test() {
  try {
    const res = await db.select().from(settings).limit(5);
    console.log('Query settings SUCCESS, rows count:', res.length);
  } catch (err) {
    console.error('Query settings ERROR:', err);
  }
}
test();
