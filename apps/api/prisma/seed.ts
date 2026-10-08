import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const cats: [string, string, string, number][] = [['Electronics','📱','electronics',.08],['Fashion','👗','fashion',.12],['Home & Living','🛋️','home-living',.10],['Beauty','🧴','beauty',.10],['Auto','🚗','auto',.05],['Computers','💻','computers',.08],['Grocery','🧺','grocery',.06],['Services','🛠️','services',.15]];
const sellers = ['Hussein Gadgets','Urban Kicks','SoundHub','Home Essentials','Tech World'];
// name, category, emoji, price, oldPrice, rating, reviews, sellerIdx, badge
const prods: [string, string, string, number, number | null, number, number, number, string | null][] = [
['Samsung Galaxy A07 128GB','Electronics','📱',14999,16999,4.8,1238,0,'12% OFF'],
["Nike Air Force 1 Men's Sneakers",'Fashion','👟',8500,null,4.7,992,1,'BEST SELLER'],
['JBL Wave 200 Earbuds','Electronics','🎧',3999,4450,4.6,674,2,'10% OFF'],
['Philips Air Fryer 4.1L','Home & Living','🍳',16500,null,4.9,521,3,'NEW'],
['Hisense 55" 4K UHD Smart TV','Electronics','📺',49999,58999,4.7,908,4,'15% OFF'],
['HP 15 Laptop 8GB / 512GB SSD','Computers','💻',62000,68000,4.6,285,4,'9% OFF'],
['Ladies Leather Handbag','Fashion','👜',3500,4200,4.5,203,1,'17% OFF'],
['Smart Watch Series 8','Electronics','⌚',6500,null,4.6,556,0,'NEW']];
async function main() {
  const categories: Record<string, string> = {};
  for (const [name, icon, slug, commissionRate] of cats) categories[name] = (await db.category.upsert({ where: { slug }, update: {}, create: { name, icon, slug, commissionRate } })).id;
  const sellerIds: string[] = [];
  for (let i = 0; i < sellers.length; i++) {
    const phone = `+25470000000${i}`;
    const u = await db.user.upsert({ where: { phone }, update: {}, create: { phone, name: sellers[i], role: 'SELLER' } });
    const s = await db.seller.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id, storeName: sellers[i], status: 'VERIFIED', rating: 4.8 } });
    sellerIds.push(s.id);
  }
  await db.user.upsert({ where: { phone: '+254700000099' }, update: {}, create: { phone: '+254700000099', name: 'Omora Admin', role: 'ADMIN' } });
  await db.coupon.upsert({ where: { code: 'WELCOME10' }, update: {}, create: { code: 'WELCOME10', percentOff: 10, minSpend: 1000 } });
  await db.product.deleteMany();
  for (const [name, cat, emoji, price, old, rating, reviewCount, si, badge] of prods)
    await db.product.create({ data: { name, emoji, price: old ?? price, salePrice: old ? price : null, rating, reviewCount, badge, stock: 50, status: 'LIVE', categoryId: categories[cat], sellerId: sellerIds[si] } });
  console.log('Seeded.');
}
main().finally(() => db.$disconnect());
