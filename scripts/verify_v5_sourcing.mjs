import { closeV5SourcingPool, getDynamicResourcing, getNegotiationCockpit, getSapUsers } from "../server/v5Sourcing.ts";
try {
  const dynamic = await getDynamicResourcing();
  const negotiation = await getNegotiationCockpit();
  const users = await getSapUsers();
  console.log(JSON.stringify({
    dynamic: { runs: dynamic.runs.length, signals: dynamic.signals.length, recommendations: dynamic.recommendations.length, diversity: dynamic.diversity.length, cycles: dynamic.cycles.length },
    negotiation: { cases: negotiation.cases.length, rounds: negotiation.rounds.length, offers: negotiation.offers.length, concessions: negotiation.concessions.length, batna: negotiation.batna.length, tactics: negotiation.tactics.length, assessments: negotiation.assessments.length, benchmarks: negotiation.benchmarks.length, messages: negotiation.messages.length, actions: negotiation.actions.length, decisions: negotiation.decisions.length, playbook: negotiation.playbook.length },
    sapCompatibility: { users: users.length, sourceTable: users[0]?.source_table, alias: users[0]?.compatibility_alias },
  }));
} finally {
  await closeV5SourcingPool();
}
