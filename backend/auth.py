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
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "hawktrace_key")

'''

auth is always this, verify password -> plain and hashed and check if bcrypt says both are same 
and you need a hash password funciton to hash

and you need an authenticate user to give user rad based on form input - uisername and password if this iexits.
and get current user should be done in each flows route where we need user id to sort and filter through this 
user's flows.
get current user just takes in current token deocdes gets payload, sees if token is valid or not =

the paths and routes will be defined in users py
'''


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.verify(plain, hashed)
    except ValueError:
        return False

def hash_password(plain: str) -> str:
    return bcrypt.hash(plain)

def create_jwt_token(user_model: UserRead) -> str:
    to_encode_payload = {
        "user_id" : user_model.id,
        "username" : user_model.username,
        "exp" : datetime.now(timezone.utc) +  timedelta(hours=1)
    }

    encoded_token = jwt.encode(to_encode_payload, JWT_SECRET_KEY, algorithm='HS256')
    return encoded_token


def authenticate_user(username: str, password: str) -> UserRead | None:
    with db.get_session() as session:
        user = session.query(UserTable).filter(UserTable.username == username).first()
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        #return user in the user read model.
        return UserRead(
            id = user.id,
            username = user.username,
            company = user.company,
            email = user.email,
            created_at=user.created_at.timestamp(),
        )

def get_user_from_token(token: str) -> UserRead:
    """Validate a raw token string and return the user. Used for WebSocket auth."""
    user_id = None
    username = None
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        username = payload.get("username")

        if not user_id or not username:
            raise HTTPException(status_code=401, detail="Invalid Token!")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token!")

    with db.get_session() as session:
        user = session.query(UserTable).filter(UserTable.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found!")
        if user.username != username:
            raise HTTPException(status_code=401, detail="Invalid token!")

        return UserRead(
            id=user.id,
            username=user.username,
            company=user.company,
            email=user.email,
            created_at=user.created_at.timestamp(),
        )


#this is the base funciton that identifies who we are (logged in session, wihtout this no authenticaated route cna be acccesed.)
def get_current_user(token: str = Depends(oauth2_scheme)) -> UserRead:
    user_id = None
    username = None
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        username = payload.get("username")

        if not user_id or not username:
            raise HTTPException(status_code=401, detail="Invalid Token!")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token!")

    with db.get_session() as session:
        user = session.query(UserTable).filter(UserTable.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found!") 
        if user.username != username:
            raise HTTPException(status_code=401, detail="Invalid token!")
    
        return UserRead(
            id = user.id,
            username = user.username,
            company = user.company,
            email = user.email,
            created_at=user.created_at.timestamp(),
        )
    
    raise HTTPException(status_code=401, detail="Severe internal error this shouldnt be shown the fuck. yeah shits down bro") 
