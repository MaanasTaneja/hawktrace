import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from fastapi.security import OAuth2PasswordRequestForm
from passlib.hash import bcrypt

from database.ht_postgres import PostgresDB, UserTable
from models import UserRead

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/hawktrace")
db = PostgresDB(DATABASE_URL)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "mohenjodaro_key")
router = APIRouter(prefix="/auth")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.verify(plain, hashed)
    except ValueError:
        return False


def hash_password(plain: str) -> str:
    return bcrypt.hash(plain)


def _to_user_read(user: UserTable) -> UserRead:
    return UserRead(
        id=user.id,
        username=user.username,
        company=user.company,
        email=user.email,
        created_at=user.created_at.timestamp(),
    )


def create_jwt_token(user_model: UserRead) -> str:
    payload = {
        "user_id": user_model.id,
        "username": user_model.username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")


def authenticate_user(username: str, password: str) -> UserRead | None:
    with db.get_session() as session:
        user = session.query(UserTable).filter(UserTable.username == username).first()
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return _to_user_read(user)


def get_user_from_token(token: str) -> UserRead:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        username = payload.get("username")
        if username is None or user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token!")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token!")

    with db.get_session() as session:
        user = session.query(UserTable).filter(UserTable.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found!")
        if user.username != username:
            raise HTTPException(status_code=401, detail="Invalid token!")
        return _to_user_read(user)


def get_current_user(token: str = Depends(oauth2_scheme)) -> UserRead:
    return get_user_from_token(token)


@router.post("/token")
def issue_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_jwt_token(user)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me")
def whoami(current_user: UserRead = Depends(get_current_user)):
    return current_user
