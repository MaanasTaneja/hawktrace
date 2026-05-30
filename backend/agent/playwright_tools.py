import base64
import json
import os

from langchain.tools import tool
from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeout

from clients.gemini import _get_client
from google.genai import types


class PlaywrightSession:
    """
    Holds a live Playwright browser instance for the duration of one agent run.
    Call start() before running the agent, stop() when done.
    """

    def __init__(self):
        self._playwright = None
        self._browser = None
        self._context = None
        self.page: Page | None = None
        self.video_path: str | None = None

    def start(self, headless: bool = True, video_dir: str | None = None):
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(headless=headless)
        context_opts = {"viewport": {"width": 1280, "height": 720}}
        if video_dir:
            os.makedirs(video_dir, exist_ok=True)
            context_opts["record_video_dir"] = video_dir
            context_opts["record_video_size"] = {"width": 1280, "height": 720}
        self._context = self._browser.new_context(**context_opts)
        self.page = self._context.new_page()

    def stop(self):
        if self.page and self._context:
            try:
                raw = self.page.video.path() if self.page.video else None
            except Exception:
                raw = None
            self._context.close()
            self.video_path = raw
        if self._browser:
            self._browser.close()
        if self._playwright:
            self._playwright.stop()
        self.page = None

    def get_tools(self) -> list:
        """Return all LangChain tools bound to this browser session."""
        page = self.page

        @tool
        def navigate_to(url: str) -> str:
            """Navigate to a URL. Returns the URL that was actually landed on."""
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=15000)
                return f"Navigated to: {page.url}"
            except PlaywrightTimeout:
                return f"Timeout navigating to {url}. Current URL: {page.url}"
            except Exception as e:
                return f"Error navigating to {url}: {e}"

        @tool
        def click_element(label: str, role: str = "") -> str:
            """
            Click an element on the page. Provide the visible text or aria-label of the element.
            Optionally provide the ARIA role (button, link, menuitem, etc.) to narrow the match.
            Tries role+label, then text match, then placeholder as fallback.
            """
            try:
                if role:
                    locator = page.get_by_role(role, name=label)
                    if locator.count() > 0:
                        locator.first.click(timeout=5000)
                        return f"Clicked {role} with label '{label}'"

                locator = page.get_by_text(label, exact=False)
                if locator.count() > 0:
                    locator.first.click(timeout=5000)
                    return f"Clicked element with text '{label}'"

                return f"Could not find element with label '{label}' and role '{role}'"
            except PlaywrightTimeout:
                return f"Timeout clicking element '{label}'"
            except Exception as e:
                return f"Error clicking element '{label}': {e}"

        @tool
        def fill_input(label: str, value: str) -> str:
            """
            Find an input field by its label, placeholder, or aria-label, then type a value into it.
            Clears any existing content before typing.
            """
            try:
                # Try by label
                locator = page.get_by_label(label, exact=False)
                if locator.count() > 0:
                    locator.first.clear()
                    locator.first.fill(value)
                    return f"Filled input '{label}' with value"

                # Try by placeholder
                locator = page.get_by_placeholder(label, exact=False)
                if locator.count() > 0:
                    locator.first.clear()
                    locator.first.fill(value)
                    return f"Filled input with placeholder '{label}' with value"

                return f"Could not find input field with label or placeholder '{label}'"
            except PlaywrightTimeout:
                return f"Timeout filling input '{label}'"
            except Exception as e:
                return f"Error filling input '{label}': {e}"

        @tool
        def get_current_url() -> str:
            """Return the current page URL."""
            return page.url

        @tool
        def check_url_contains(pattern: str) -> str:
            """
            Tier 1 verification: check if the current URL contains a pattern.
            Returns 'pass' or 'fail: <current_url>'.
            """
            current = page.url
            if pattern in current:
                return "pass"
            return f"fail: expected URL to contain '{pattern}' but got '{current}'"

        @tool
        def check_text_present(text: str) -> str:
            """
            Tier 1 verification: check if a specific text string is visible on the page.
            Returns 'pass' or 'fail'.
            """
            try:
                page.get_by_text(text, exact=False).first.wait_for(state="visible", timeout=3000)
                return "pass"
            except PlaywrightTimeout:
                return f"fail: text '{text}' not found on page"
            except Exception as e:
                return f"fail: {e}"

        @tool
        def get_accessibility_tree() -> str:
            """
            Tier 2 verification: return the semantic accessibility snapshot of the current page.
            Use this to understand what elements are present without a screenshot.
            """
            try:
                snapshot = page.accessibility.snapshot()
                return json.dumps(snapshot, indent=2)
            except Exception as e:
                return f"Error getting accessibility tree: {e}"

        @tool
        def take_screenshot_and_ask(expected_visual: str) -> str:
            """
            Tier 3 verification: take a screenshot of the current page and ask Gemini
            whether it matches the expected visual description.
            Returns 'pass: <explanation>' or 'fail: <explanation>'.
            """
            try:
                screenshot_bytes = page.screenshot(type="jpeg", quality=80)
                image_b64 = base64.b64encode(screenshot_bytes).decode()

                client = _get_client()
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=types.Content(parts=[
                        types.Part(
                            inline_data=types.Blob(
                                mime_type="image/jpeg",
                                data=screenshot_bytes,
                            )
                        ),
                        types.Part(text=(
                            f"You are a QA engineer reviewing a screenshot.\n\n"
                            f"Expected visual state: {expected_visual}\n\n"
                            f"Does the screenshot match this expected state? "
                            f"Reply with exactly 'pass' or 'fail' on the first line, "
                            f"then one sentence explaining why."
                        )),
                    ]),
                    config=types.GenerateContentConfig(
                        max_output_tokens=256,
                        temperature=0.1,
                    ),
                )
                answer = response.text.strip()
                first_line = answer.split("\n")[0].lower()
                verdict = "pass" if first_line.startswith("pass") else "fail"
                return f"{verdict}: {answer}"
            except Exception as e:
                return f"fail: screenshot verification error — {e}"

        return [
            navigate_to,
            click_element,
            fill_input,
            get_current_url,
            check_url_contains,
            check_text_present,
            get_accessibility_tree,
            take_screenshot_and_ask,
        ]
