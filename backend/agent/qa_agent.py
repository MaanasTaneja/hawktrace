import json
import operator
import os
from datetime import datetime, timezone
from typing import Annotated, TypedDict

from google import genai as google_genai
from google.genai import types as google_types
from langgraph.graph import END, START, StateGraph

from agent.playwright_tools import PlaywrightSession

'''
okay this does not seem ot use any of my preious abstractions in creating a new agent.
base state agent is not being used, its just standard langgraph, thats been wired up.
qa agent...

'''

class QAAgentState(TypedDict):
    recipe: dict
    step_index: int
    step_results: Annotated[list, operator.add]
    report: dict
    abort: bool


class QAAgent:
    """
    Replays a recorded flow step-by-step using a pre-defined recipe.
    Does not use an LLM planner — the recipe IS the plan.
    Uses tiered verification after each step.
    """

    def __init__(self, session: PlaywrightSession):
        self._gemini = google_genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.session = session
        self.tools = {t.name: t for t in session.get_tools()}
        self.graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(QAAgentState)
        workflow.add_node("run_step", self._run_step)
        workflow.add_node("build_report", self._build_report)

        workflow.add_edge(START, "run_step")
        workflow.add_conditional_edges("run_step", self._route, {
            "continue": "run_step",
            "done": "build_report",
        })
        workflow.add_edge("build_report", END)
        return workflow.compile()

    # ------------------------------------------------------------------ #
    #  Nodes                                                               #
    # ------------------------------------------------------------------ #

    def _run_step(self, state: QAAgentState) -> dict:
        steps = state["recipe"]["steps"]
        idx = state["step_index"]

        if idx >= len(steps):
            return {"abort": True, "step_index": idx}

        step = steps[idx]
        print(f"[qa_agent] step {step['step_id']}/{len(steps)}: {step['description']}")

        exec_result = self._execute(step)
        step_result = self._verify(step, exec_result)

        on_failure = step.get("on_failure", "continue")
        abort = step_result["status"] == "failed" and on_failure == "stop"

        if abort:
            print(f"[qa_agent] step {step['step_id']} failed with on_failure=stop — aborting")

        return {
            "step_index": idx + 1,
            "step_results": [step_result],
            "abort": abort,
        }

    def _build_report(self, state: QAAgentState) -> dict:
        results = state["step_results"]
        total = len(results)
        passed = sum(1 for r in results if r["status"] == "passed")
        failed = sum(1 for r in results if r["status"] == "failed")
        skipped = sum(1 for r in results if r["status"] == "skipped")

        overall = "passed" if failed == 0 and skipped == 0 else "failed"

        report = {
            "overall": overall,
            "goal": state["recipe"].get("goal"),
            "success_criteria": state["recipe"].get("success_criteria"),
            "summary": f"{passed}/{total} steps passed",
            "steps_total": total,
            "steps_passed": passed,
            "steps_failed": failed,
            "steps_skipped": skipped,
            "step_results": results,
            "ran_at": datetime.now(timezone.utc).isoformat(),
        }
        print(f"[qa_agent] report: {overall} — {passed}/{total} steps passed")
        return {"report": report}

    # ------------------------------------------------------------------ #
    #  Routing                                                             #
    # ------------------------------------------------------------------ #

    def _route(self, state: QAAgentState) -> str:
        steps = state["recipe"]["steps"]
        if state.get("abort") or state["step_index"] >= len(steps):
            return "done"
        return "continue"

    # ------------------------------------------------------------------ #
    #  Execution                                                           #
    # ------------------------------------------------------------------ #

    def _execute(self, step: dict) -> str:
        action = step["action_type"]
        target = step.get("target") or {}

        try:
            if action == "navigate":
                url = step.get("url") or ""
                if not url:
                    return "error: navigate step has no url"
                result = self.tools["navigate_to"].invoke({"url": url})
                self.session.page.wait_for_timeout(1800)
                return result

            elif action == "click":
                label = target.get("label") or target.get("fallback_text") or ""
                role = target.get("role") or ""
                result = self.tools["click_element"].invoke({"label": label, "role": role})
                self.session.page.wait_for_timeout(1200)
                return result

            elif action == "fill":
                label = target.get("label") or target.get("placeholder") or ""
                value = step.get("value") or ""
                result = self.tools["fill_input"].invoke({"label": label, "value": value})
                self.session.page.wait_for_timeout(600)
                return result

            elif action == "scroll":
                delta_y = step.get("delta_y") or 600
                self.session.page.evaluate(f"window.scrollBy(0, {int(delta_y)})")
                self.session.page.wait_for_timeout(900)
                return f"scrolled down {delta_y}px"

            elif action == "select":
                label = target.get("label") or ""
                value = step.get("value") or ""
                result = self.tools["fill_input"].invoke({"label": label, "value": value})
                self.session.page.wait_for_timeout(600)
                return result

            else:
                return f"unknown action type: {action}"

        except Exception as e:
            return f"execution error: {e}"

    # ------------------------------------------------------------------ #
    #  Tiered verification                                                 #
    # ------------------------------------------------------------------ #

    def _verify(self, step: dict, exec_result: str) -> dict:
        assertions = step.get("assertions", {})
        tier1 = assertions.get("tier1", {})
        tier3_visual = assertions.get("tier3_expected_visual", "")

        base = {
            "step_id": step["step_id"],
            "description": step["description"],
            "action_type": step.get("action_type"),
            "target": step.get("target") or {},
            "value": step.get("value"),
            "url": step.get("url"),
            "expected_visual": tier3_visual,
            "exec_result": exec_result,
            "failure_reason": None,
            "tier_used": None,
        }

        # Execution itself failed — skip verification
        if exec_result.startswith("error:") or exec_result.startswith("execution error"):
            return {**base, "status": "failed", "failure_reason": exec_result, "tier_used": "exec"}

        # Tier 1 — instant string checks
        tier1_result = self._check_tier1(tier1)
        if tier1_result == "pass":
            return {**base, "status": "passed", "tier_used": "tier1"}

        print(f"[qa_agent] step {step['step_id']} tier1 failed: {tier1_result} — trying tier2")

        # Tier 2 — accessibility tree + LLM
        tier2_result = self._check_tier2(step["description"], tier3_visual)
        if tier2_result == "pass":
            return {**base, "status": "passed", "tier_used": "tier2"}

        print(f"[qa_agent] step {step['step_id']} tier2 failed — trying tier3")

        # Tier 3 — screenshot + Gemini vision
        tier3_result = self.tools["take_screenshot_and_ask"].invoke({"expected_visual": tier3_visual})
        if tier3_result.startswith("pass"):
            return {**base, "status": "passed", "tier_used": "tier3"}

        return {
            **base,
            "status": "failed",
            "tier_used": "tier3",
            "failure_reason": tier3_result,
        }

    def _check_tier1(self, tier1: dict) -> str:
        url_pattern = tier1.get("url_contains")
        text = tier1.get("text_present")

        # Nothing to check — treat as pass
        if not url_pattern and not text:
            return "pass"

        if url_pattern:
            result = self.tools["check_url_contains"].invoke({"pattern": url_pattern})
            if result != "pass":
                return result

        if text:
            result = self.tools["check_text_present"].invoke({"text": text})
            if result != "pass":
                return result

        return "pass"

    def _check_tier2(self, step_description: str, expected_visual: str) -> str:
        try:
            tree = self.tools["get_accessibility_tree"].invoke("")
            if len(tree) > 6000:
                tree = tree[:6000] + "\n...(truncated)"

            prompt = (
                "You are a QA engineer reviewing a page's accessibility tree. "
                "Answer only 'pass' or 'fail' on the first line, then one sentence explaining why.\n\n"
                f"We just performed this action: {step_description}\n\n"
                f"Expected page state: {expected_visual}\n\n"
                f"Accessibility tree:\n{tree}\n\n"
                "Does the page state match the expected state?"
            )
            response = self._gemini.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            answer = response.text.strip().lower()
            return "pass" if answer.startswith("pass") else "fail"
        except Exception as e:
            return f"tier2 error: {e}"

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def run(self, recipe: dict) -> dict:
        """Run the full QA check for a recipe. Returns the final report dict."""
        initial_state = {
            "recipe": recipe,
            "step_index": 0,
            "step_results": [],
            "report": {},
            "abort": False,
        }
        final_state = self.graph.invoke(initial_state)
        return final_state["report"]
