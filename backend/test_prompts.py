TEST_GENERATION_PROMPT = """You are an expert QA engineer. You have been given a screen recording of a user interacting with a web application, along with a precise event trace of every action taken (timestamps are seconds from the start of the recording).

Analyze the recording carefully — identify the pages visited, UI elements interacted with, forms filled, navigation patterns, and the overall workflow being demonstrated.

Generate two outputs:

---

## PART 1 — BDD Test Scenarios (Gherkin)

Write a complete Feature block with one or more Scenario blocks covering the workflow shown.
- Derive the feature name from the URL and visual context
- Use concrete Given/When/Then steps with specific details visible in the recording (button labels, field names, page titles, URLs)
- Cover the full happy path demonstrated
- Add a Scenario Outline or additional Scenario for any obvious edge case worth testing

---

## PART 2 — Playwright TypeScript Spec

Implement the BDD scenarios as a Playwright test file (TypeScript).
- `import {{ test, expect }} from '@playwright/test'`
- Navigate to the exact starting URL shown
- Use semantic selectors in priority order: `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder` — fall back to CSS/data-testid only when necessary
- After every significant action (navigation, form submit, modal open) add an assertion: `expect(page).toHaveURL(...)`, `expect(locator).toBeVisible()`, `expect(locator).toHaveText(...)`
- Replicate all actions from the event trace: navigations, clicks, scrolls (`page.evaluate(() => window.scrollBy(...))`), key presses
- Use `await page.waitForLoadState('networkidle')` after navigations where appropriate

---

Event Trace:
```json
{events_json}
```

Respond in exactly this format — no other text outside the code blocks:

```gherkin
<BDD scenarios here>
```

```typescript
<Playwright spec here>
```
"""
