# Hawktrace

AI-powered QA test generation platform. Record browser sessions, capture user flows, and automatically generate BDD scenarios and Playwright test specs using Gemini video analysis.

---

## How it works

1. Enter a URL — a Playwright browser session launches on the backend and streams live to your browser
2. Interact with the website normally
3. Hit **Mark Flow** to start recording a workflow, **End Flow** to stop
4. The session is encoded to MP4 with a timestamped event trace (clicks, scrolls, keypresses, navigations)
5. Hit **Generate Tests** — the video + event trace is sent to Gemini, which outputs a Gherkin BDD feature file and a Playwright TypeScript spec

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, React 18 |
| Backend | FastAPI, Python 3.11, Uvicorn |
| Browser automation | Playwright (Chromium, headless) |
| Database | MongoDB 7 |
| AI | Google Gemini API |
| Video encoding | PyAV (H.264), FFmpeg |
| Infrastructure | Docker, Docker Compose |

---

## Getting started

### 1. Clone and configure

```bash
git clone git@github.com:MaanasTaneja/hawktrace.git
cd hawktrace
```

Create a `.env` file in the root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8001

GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
RUNWAYML_API_KEY=your_runwayml_key
ELEVENLABS_API_KEY=your_elevenlabs_key
TAVILY_API_KEY=your_tavily_key
```

### 2. Run

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:8001 |
| MongoDB | localhost:27017 |

---

## API

### Browser session
| Method | Endpoint | Description |
|---|---|---|
| WS | `/ws/browser` | Live browser session — streams frames, receives events |

WebSocket message types: `navigate`, `click`, `dblclick`, `scroll`, `keydown`, `start_flow`, `end_flow`

### Flows
| Method | Endpoint | Description |
|---|---|---|
| GET | `/flows` | List all recorded flows |
| GET | `/flows/{id}/video` | Serve the flow MP4 |
| GET | `/flows/{id}/events` | Get the event trace |
| GET | `/flows/{id}/tests` | Get generated tests |
| POST | `/flows/{id}/generate_tests` | Run Gemini test generation |

### Health
| Method | Endpoint |
|---|---|
| GET | `/` |
| GET | `/health` |

---

## Project structure

```
hawktrace/
├── backend/
│   ├── autonomy/           # LangGraph agent framework
│   ├── main.py             # FastAPI app + middleware
│   ├── browser_session.py  # WebSocket + Playwright + FlowRecorder
│   ├── flows.py            # Flow API routes
│   ├── pipeline.py         # Video generation pipeline
│   ├── test_generator.py   # Gemini upload + test generation
│   ├── test_prompts.py     # Gemini prompts
│   ├── db.py               # MongoDB client
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── page.jsx        # Main UI — browser session + flow viewer
│   │   └── layout.jsx
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── .env                    # Not committed
```

---

## Event trace format

Each recorded flow produces a document in MongoDB with a processed event list:

```json
{
  "flow_id": "4dc5a77c24",
  "started_at": 1748000000.0,
  "fps": 20,
  "frame_count": 240,
  "events": [
    { "type": "navigate", "url": "https://example.com", "t": 0.0, "video_t": 0.05 },
    { "type": "click",    "x": 640, "y": 360,           "t": 2.1, "video_t": 2.2  },
    { "type": "scroll",   "deltaY": 800,                "t": 4.3, "video_t": 4.35 }
  ]
}
```

`t` — perf_counter seconds from flow start
`video_t` — mapped frame index / fps (what you seek to in the video player)

---

## Notes

- Gemini API requires a paid account (free tier quota is very low for video)
- Videos stay on the filesystem (`backend/flows/{id}/{id}.mp4`) — all other data is in MongoDB
- The `flows/` directory is gitignored
