from pydantic import BaseModel


class RenameBody(BaseModel):
    name: str


class UserBase(BaseModel):
    username: str
    company: str
    email: str

#create will have an additional password since this is sent uptoo tje backend freom frotnoend to registe a user.
class UserCreate(UserBase):
    password: str 


#only read wil hgave id and created at since reading from db a user means this user is created.
class UserRead(UserBase):
    id: int
    created_at: float


#added user updaye as well just inc asee. no need to delet users though
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


class AnalyzeBody(BaseModel):
    goal: str | None = None
    success_criteria: str | None = None


class FlowAnalysisRead(BaseModel):
    flow_id: str
    goal: str | None = None
    success_criteria: str | None = None
    observations: list[dict]


class FlowRenameRead(BaseModel):
    flow_id: str
    name: str


class FlowDeleteRead(BaseModel):
    deleted: str
