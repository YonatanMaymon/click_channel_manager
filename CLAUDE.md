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

## Explain, then interview

The project owner is learning while Claude Code writes most of the code, and needs to understand every change. After finishing each code change (a finished task or commit, not every small edit along the way):

1. **Explain what changed and why.** Go file by file: what each change does, why it's needed, and what would break without it. Explain every new technical idea in depth, in plain words, with an everyday example where it helps. Link each idea to this project (bookings, sync, payments) rather than leaving it abstract.
2. **Interview the owner.** Ask 4–7 questions in their own words, easy to hard. Prefer "what happens if…" scenarios and "spot the bug" questions over asking for definitions. Include at least one question that connects the new change to earlier ones.
3. **Grade the answers honestly.** Say which are right, partly right or wrong. Correct each misunderstanding directly, then explain the correct answer. Don't count vague answers ("UI bugs") as right; ask for the specific thing.
4. **End with a short summary** of what's solid and what to review, and offer another short round on the weak spots.

Ideas the owner has found hard so far, worth coming back to when a change touches them: transactions being all or nothing (atomicity), spotting check-then-act race conditions in code, idempotency, and matching records by a permanent ID (such as an iCal UID) instead of by their values.

Skip the interview only if the owner says so for that change.
