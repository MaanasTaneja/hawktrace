from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from pipeline.browser_session import router as browser_router
from pipeline.flows import router as flows_router
from pipeline.agents import router as agents_router
from users.users import user_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.runway_client = None
    app.state.elevenlabs_client = None
    yield


app = FastAPI(lifespan=lifespan, title="Vigil")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(browser_router)
app.include_router(flows_router)
app.include_router(agents_router)
app.include_router(user_router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Backend is up"}


@app.get("/health")
def health():
    return {"status": "healthy"}
