const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing.');
  const sourcePath = path.join(__dirname, '..', 'js', 'posts-data.js');
  let source = fs.readFileSync(sourcePath, 'utf8');
  source = source.replace('let POSTS_DB = [', 'globalThis.POSTS_DB = [', 1);
  // Only evaluate the data file; the helper functions are harmless and are not called here.
  const context = { console };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: sourcePath });
  const posts = context.POSTS_DB;
  if (!Array.isArray(posts)) throw new Error('Could not read POSTS_DB.');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const p of posts) {
      await pool.query(
        `INSERT INTO posts (slug,title,excerpt,image,tags,author,date,read_time,featured,published,content)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10)
         ON CONFLICT (slug) DO NOTHING`,
        [p.slug, p.title, p.excerpt || '', p.image || '', p.tags || [], p.author || 'Kartik Yadav Gurve', p.date, Number(p.readTime) || 1, !!p.featured, p.content || '']
      );
    }
    console.log(`Seed complete. Processed ${posts.length} existing posts.`);
  } finally { await pool.end(); }
}
main().catch(err => { console.error(err); process.exit(1); });
