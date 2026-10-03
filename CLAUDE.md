@AGENTS.md

## Tests first, then code

For any change with behaviour worth testing (prices, availability, sync, payments, permissions):

1. **Write the tests first**, from the expected behaviour in MVP Spec.md, PLAN.md or the task, not from how the code will work. Include edge cases and failure cases, not only the happy path.
2. **Run them and confirm they fail** for the right reason (the feature is missing, not a typo or a broken import).
3. **Then implement** until they pass.

To avoid code that only satisfies the tests:

- Write the general rule, never special cases for the exact values a test uses.
- Don't change, weaken or delete a test to make it pass. If a test turns out to be wrong, say so, explain why, and fix it as a separate, visible step.
- Work out expected values by hand from the rules (for example, a price from the nightly rates), never by copying what the code outputs.
- Test behaviour through public functions, not internal details, so the code can be restructured without rewriting the tests.
