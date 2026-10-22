// Idempotent master data: locations, categories + attributes, and the OWN investor.
import { AttributeType, LocationType, PrismaClient, ShareType } from '@prisma/client';

type AttrSeed = {
  key: string;
  label: string;
  type: AttributeType;
  options?: string[];
};

type CategorySeed = {
  name: string;
  isSerialized: boolean;
  attributes: AttrSeed[];
};

const PHONE_ATTRS: AttrSeed[] = [
  { key: 'storage', label: 'Storage', type: 'SELECT', options: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
  { key: 'color', label: 'Color', type: 'TEXT' },
];

const CATEGORIES: CategorySeed[] = [
  { name: 'iPhone', isSerialized: true, attributes: PHONE_ATTRS },
  { name: 'iPad', isSerialized: true, attributes: PHONE_ATTRS },
  {
    name: 'MacBook',
    isSerialized: true,
    attributes: [
      { key: 'processor', label: 'Processor', type: 'TEXT' },
      { key: 'ram', label: 'RAM', type: 'SELECT', options: ['8GB', '16GB', '24GB', '32GB', '64GB'] },
      { key: 'storage', label: 'Storage', type: 'SELECT', options: ['256GB', '512GB', '1TB', '2TB'] },
    ],
  },
  { name: 'Accessory', isSerialized: false, attributes: [] },
];

const LOCATIONS: { name: string; type: LocationType }[] = [
  { name: 'Sklad', type: 'WAREHOUSE' },
  { name: "Do'kon", type: 'SHOP' },
];

/** Upserts locations, categories with their attributes, and the OWN investor. Safe to re-run. */
export async function seedMasterData(prisma: PrismaClient): Promise<void> {
  for (const location of LOCATIONS) {
    await prisma.location.upsert({
      where: { name: location.name },
      update: {},
      create: location,
    });
  }

  for (const cat of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { name: cat.name, isSerialized: cat.isSerialized },
    });
    for (const [index, attr] of cat.attributes.entries()) {
      await prisma.categoryAttribute.upsert({
        where: { categoryId_key: { categoryId: category.id, key: attr.key } },
        update: {},
        create: {
          categoryId: category.id,
          key: attr.key,
          label: attr.label,
          type: attr.type,
          options: attr.options ?? [],
          sortOrder: index,
        },
      });
    }
  }

  await prisma.investor.upsert({
    where: { code: 'OWN' },
    update: {},
    create: { name: 'Own', code: 'OWN', isOwn: true, shareType: ShareType.NONE },
  });
}
