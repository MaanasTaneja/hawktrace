from fastapi.security import OAuth2PasswordRequestForm
from fastapi import HTTPException, Depends
from auth import authenticate_user, get_current_user, create_jwt_token, oauth2_scheme, hash_password
from models import UserBase, UserRead, UserCreate, UserUpdate
from fastapi.routing import APIRouter
from database.ht_user import insert_user, delete_user, update_user, get_user, get_all_users, get_user_by_email, get_user_by_username
from database.ht_postgres import PostgresDB
from database.ht_postgres import UserTable
from auth import hash_password

import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/hawktrace")
db = PostgresDB(DATABASE_URL)

user_router = APIRouter(prefix='/users')

@user_router.post("/token")
def issue_token(form_data: OAuth2PasswordRequestForm = Depends()):
    #from frontend when we get form data for usename and passowrd, authethciate tehem, if the user doesnt exist 
    #in db then we retunr invald http exception
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    #if they exist in db then create token for them and reutn bac the token
    #jwt token is onuly created via the user read model. since we need to fethc only flows with id which is username right.
    token = create_jwt_token(user)
    return {"access_token": token, "token_type": "bearer"}


@user_router.get("/me")
def whoami(current_user: UserRead = Depends(get_current_user)):
    return current_user


@user_router.post("/register")
def register_user(user : UserCreate):
    if not user:
        raise HTTPException(status_code=401, detail="no user payload in request!")
    
    #now we can register this user
    with db.get_session() as session:
        email = user.email
        if get_user_by_email(session, email):
            raise HTTPException(status_code=401, detail="User Already Exists!")
        
        #if user doesnt exist we can hash password and sotre into db
        hashed_password = hash_password(user.password)
        #replce in user create
        user.password = hashed_password

        new_user = insert_user(session, user) #gives out user read model right
        if not new_user:
            raise HTTPException(status_code=401, detail="User Could not be inserted!!")
        
    return new_user

@user_router.put("/update")
def update_user(user : UserUpdate):
    if not user:
        raise HTTPException(status_code=401, detail="no user payload in request!")
    
    with db.get_session() as session:
        email = user.email
        user = get_user_by_email(session, email)
        if not user:
            raise HTTPException(status_code=401, detail="User doesnt exist!")
        
        updated_user = update_user(user)
        if not updated_user:
            raise HTTPException(status_code=500, detail="Database Update Error!")
        
    return updated_user




#no need to impelmentdelete uyser, update user or anythign like that yet. just login shoudl work and registering should work,



