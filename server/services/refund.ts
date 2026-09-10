import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

const ADMIN = 'admin';

export async function refundPollOptionVotes(tx: Tx, optionId: string) {
  const option = await tx.pollOption.findUnique({ where: { id: optionId } });
  if (!option) throw Object.assign(new Error('Poll option not found'), { status: 404 });

  const votes = await tx.pollVote.findMany({
    where: { poll_option_id: optionId, reversed_at: null },
    orderBy: { created_at: 'asc' },
  });
  let refundedCents = 0;
  let creditedCents = 0;

  for (const vote of votes) {
    const donor = await tx.donor.findUnique({ where: { id: vote.donor_id } });
    if (!donor) throw Object.assign(new Error('Donor not found'), { status: 404 });

    const balanceAfter = donor.balance_remaining + vote.amount_cents;
    await tx.donor.update({
      where: { id: donor.id },
      data: { balance_remaining: { increment: vote.amount_cents } },
    });
    await tx.pollVote.update({
      where: { id: vote.id },
      data: { reversed_at: new Date(), reversed_by: ADMIN },
    });
    await tx.balanceAdjustment.create({
      data: {
        donor_id: donor.id,
        amount_cents: vote.amount_cents,
        balance_after_cents: balanceAfter,
        type: 'REFUND',
        reason: 'Refunded removed poll option',
        reference_id: vote.id,
        created_by: ADMIN,
      },
    });

    refundedCents += vote.amount_cents;
    if (option.status === 'ACTIVE') creditedCents += vote.amount_cents;
  }

  if (creditedCents > 0) {
    await tx.pollOption.update({
      where: { id: option.id },
      data: { votes_cents: { decrement: creditedCents } },
    });
    await tx.poll.update({
      where: { id: option.poll_id },
      data: { total_votes_cents: { decrement: creditedCents } },
    });
  }

  return { refunded_count: votes.length, refunded_cents: refundedCents };
}

export async function refundGoalContributions(tx: Tx, goalId: string) {
  const goal = await tx.fundGoal.findUnique({ where: { id: goalId } });
  if (!goal) throw Object.assign(new Error('Goal not found'), { status: 404 });

  const contributions = await tx.fundContribution.findMany({
    where: { goal_id: goalId, reversed_at: null },
    orderBy: { created_at: 'asc' },
  });
  let refundedCents = 0;

  for (const contribution of contributions) {
    const donor = await tx.donor.findUnique({ where: { id: contribution.donor_id } });
    if (!donor) throw Object.assign(new Error('Donor not found'), { status: 404 });

    const balanceAfter = donor.balance_remaining + contribution.amount_cents;
    await tx.donor.update({
      where: { id: donor.id },
      data: { balance_remaining: { increment: contribution.amount_cents } },
    });
    await tx.fundContribution.update({
      where: { id: contribution.id },
      data: { reversed_at: new Date(), reversed_by: ADMIN },
    });
    await tx.balanceAdjustment.create({
      data: {
        donor_id: donor.id,
        amount_cents: contribution.amount_cents,
        balance_after_cents: balanceAfter,
        type: 'REFUND',
        reason: 'Refunded removed fundraising goal',
        reference_id: contribution.id,
        created_by: ADMIN,
      },
    });
    refundedCents += contribution.amount_cents;
  }

  if (refundedCents > 0) {
    const currentCents = goal.current_cents - refundedCents;
    await tx.fundGoal.update({
      where: { id: goal.id },
      data: {
        current_cents: { decrement: refundedCents },
        is_complete: currentCents >= goal.target_cents,
      },
    });
  }

  return { refunded_count: contributions.length, refunded_cents: refundedCents };
}
