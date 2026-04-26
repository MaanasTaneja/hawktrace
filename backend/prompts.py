VIDEO_ANALYSIS_PROMPT = """You are a QA engineer analyzing a screen recording of a user flow.
{goal_context}
You have been given:
1. A video recording of user interactions with a web application
2. A list of events with video timestamps (in seconds from start)

Your task: for each event, look at the corresponding moment in the video and describe what the user did and what visually changed on screen after that action.

Return a JSON array — one object per event — in this exact format:
[
  {{
    "event_id": 0,
    "action_taken": "short description of the user action",
    "visual_outcome": "what visually changed on screen after this action"
  }},
  ...
]

Guidelines:
- Use the event type and element info (selector, placeholder, text) to describe the action_taken precisely
- For visual_outcome, describe what actually appeared/changed/disappeared on screen — be specific and concrete
- For scroll events describe what became visible after scrolling
- For fill events include the value that was typed
- For navigation events describe the page that loaded
- Return ONLY the JSON array, no markdown, no extra text

Events:
{events_json}
"""
