import prisma from '../lib/prisma.js';

async function main() {
  const events = await prisma.event.findMany({ where: { is_active: true } });
  if (events.length === 0) {
    console.error('No active events found. Create some events first.');
    process.exit(1);
  }

  const donations = await prisma.donation.findMany({
    where: { event_id: null },
    select: { id: true, external_id: true },
  });

  if (donations.length === 0) {
    console.log('No unassigned donations found.');
    return;
  }

  console.log(`Found ${donations.length} donations without an event.`);
  console.log(`Assigning to one of ${events.length} active events...`);

  let updated = 0;
  for (const donation of donations) {
    const event = events[Math.floor(Math.random() * events.length)];
    await prisma.donation.update({
      where: { id: donation.id },
      data: { event_id: event.id },
    });
    console.log(`  ${donation.external_id} → ${event.name}`);
    updated++;
  }

  console.log(`Done. Assigned ${updated} donations to random events.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
