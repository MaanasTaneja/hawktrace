from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database.ht_postgres import UserTable
from models import UserCreate, UserRead, UserUpdate

def _to_user_read(user: UserTable) -> UserRead:
    return UserRead(
        id=user.id,
        username=user.username,
        company=user.company,
        email=user.email,
        created_at=user.created_at.timestamp(),
    )

def insert_user(session: Session, user: UserCreate) -> UserRead | None:
    new_user = UserTable(
        username=user.username,
        company=user.company,
        email=user.email,
        password_hash=user.password,
    )
    try:
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
    except SQLAlchemyError as e:
        session.rollback()
        print(f"Error inserting user: {e}")
        return None
    return _to_user_read(new_user)


def update_user(session: Session, user: UserUpdate) -> UserRead | None:
    existing_user = session.query(UserTable).filter(UserTable.id == user.id).first()
    if not existing_user:
        return None

    try:
        for k, v in user.model_dump(exclude_none=True).items():
            if k != "id" and hasattr(existing_user, k):
                setattr(existing_user, k, v)
        session.commit()
        session.refresh(existing_user)
    except SQLAlchemyError as e:
        session.rollback()
        print(f"Error updating user: {e}")
        return None

    return _to_user_read(existing_user)


def delete_user(session: Session, user_id: int) -> bool:
    to_delete_user = session.query(UserTable).filter(UserTable.id == user_id).first()
    if not to_delete_user:
        return False

    try:
        session.delete(to_delete_user)
        session.commit()
    except SQLAlchemyError as e:
        session.rollback()
        print(f"Error deleting user: {e}")
        return False
    return True


def get_user(session: Session, user_id: int) -> UserRead | None:
    existing_user = session.query(UserTable).filter(UserTable.id == user_id).first()
    if not existing_user:
        return None
    return _to_user_read(existing_user)


def get_all_users(session: Session, limit: int = 100) -> list[UserRead]:
    users = session.query(UserTable).limit(limit).all()
    return [_to_user_read(u) for u in users]


def get_user_by_email(session: Session, email: str) -> UserRead | None:
    existing_user = session.query(UserTable).filter(UserTable.email == email).first()
    if not existing_user:
        return None
    return _to_user_read(existing_user)


def get_user_by_username(session: Session, username: str) -> UserRead | None:
    existing_user = session.query(UserTable).filter(UserTable.username == username).first()
    if not existing_user:
        return None
    return _to_user_read(existing_user)
