import { runIntakeAssistant } from '../server/intake-llm.ts';

const result = await runIntakeAssistant({
  mode: 'suggestions',
  section: { id: 'need', title: 'Business Need', fields: ['category', 'requestType', 'requirementDescription'] },
  fieldHelp: { category: 'IT Services or IT Hardware', requestType: 'Services or Goods', requirementDescription: 'what is needed' },
  captured: {},
  context: { requestType: '', category: '', procurementType: 'Strategic Sourcing', priority: 'MEDIUM' },
  userMessage: 'Generate concise product and services example prompts for an IT sourcing request.',
});
console.log(JSON.stringify({ provider: result.provider, suggestions: result.suggestions, hasReply: Boolean(result.reply) }));
