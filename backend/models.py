from pydantic import BaseModel


class RenameBody(BaseModel):
    name: str


class UserBase(BaseModel):
    username: str
    company: str
    email: str


class UserCreate(UserBase):
    password_hash: str


class UserRead(UserBase):
    id: int
    created_at: float


class UserUpdate(BaseModel):
    id: int
    username: str | None = None
    company: str | None = None
    email: str | None = None
    password_hash: str | None = None


class FlowListItem(BaseModel):
    flow_id: str
    name: str | None = None
    started_at: float
    frame_count: int
    event_count: int
    has_tests: bool


class FlowEventsRead(BaseModel):
    flow_id: str
    started_at: float
    fps: int
    frame_count: int
    event_count: int
    events: list[dict]


class FlowTestsRead(BaseModel):
    flow_id: str
    bdd: str
    playwright: str


class FlowRenameRead(BaseModel):
    flow_id: str
    name: str


class FlowDeleteRead(BaseModel):
    deleted: str
