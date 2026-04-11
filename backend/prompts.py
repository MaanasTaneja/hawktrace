TEST_GENERATION_PROMPT = """You are an expert QA engineer. You have been given a screen recording of a user interacting with a web application, along with a precise event trace of every action taken (timestamps are seconds from the start of the recording).

Analyze the recording carefully — identify the pages visited, UI elements interacted with, forms filled, navigation patterns, and the overall workflow being demonstrated.

Generate two outputs:

IMPORTANT RULES FOR ASSERTIONS:
- Never assert specific text content that comes from a database or CMS
  (article titles, product names, prices, user generated content)
- Always assert structural elements that should always exist
  (section headings, navigation, at least one item in a list, buttons)
- For lists and feeds assert count > 0 not specific items
- For content websites use: expect(locator.first()).toBeVisible()
  not expect(page.getByText('specific article title')).toBeVisible()
- If the recorded content looks dynamic (news, products, posts)
  generate count-based assertions not content-based ones


SCROLL HANDLING RULES:
- Never use scrollBy with hardcoded pixel values to reach a specific element
- Instead use: await page.locator('target element').scrollIntoViewIfNeeded()
- Only use scrollBy for testing scroll behavior itself like infinite scroll or lazy loading
- Replace waitForTimeout with waitForLoadState or expect().toBeVisible() with timeout
- Hardcoded timeouts over 500ms are always a sign something better exists

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
