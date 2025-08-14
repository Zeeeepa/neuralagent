import jwt
import datetime
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from db.models import User, LoginSession
from typing import Optional
from fastapi import status
from utils import constants
from .procedures import CustomError
import os


# Constants (replace with your own values or configurations)
JWT_SECRET = os.getenv('JWT_SECRET')
JWT_ISS = os.getenv('JWT_ISS')
JWT_AUDIENCE_CLAIM = 'NeuralAgent'


def _to_naive_utc(dt: datetime.datetime) -> datetime.datetime:
    return dt.astimezone(datetime.UTC).replace(tzinfo=None) if dt.tzinfo else dt 


def create_token_from_user(user: User, exp: datetime.datetime, session_id: int, with_refresh: bool = True):
    """
    Create an access token and optional refresh token for a user.
    """
    payload = {
        "user_id": user.id,
        "aud": JWT_AUDIENCE_CLAIM,
        "iss": JWT_ISS,
        "sub": str(user.id),
        "exp": exp,
        "session_id": session_id,
        "token_type": "access",
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    refresh_token = None

    if with_refresh:
        refresh_exp = datetime.datetime.now(datetime.UTC) + constants.REFRESH_TOKEN_LIFETIME_DELTA
        payload["exp"] = refresh_exp
        payload["token_type"] = "refresh"
        refresh_token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    return token, refresh_token


def decode_token(raw_token: str):
    """
    Decode a JWT token.
    """
    try:
        payload = jwt.decode(
            raw_token,
            JWT_SECRET,
            audience=JWT_AUDIENCE_CLAIM,
            issuer=JWT_ISS,
            algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise CustomError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message="Invalid_Token"
        )
    except jwt.InvalidTokenError:
        raise CustomError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message="Invalid_Token"
        )


async def is_session_valid(session_id: int, db_session: AsyncSession):
    """
    Check if a session is valid by querying the database.
    """
    query = select(LoginSession).where(LoginSession.id == session_id)
    result = (await db_session.exec(query)).first()

    if result and not result.is_logged_out:
        return True

    return False


async def create_login_session(user: User, db_session: AsyncSession, expires_at: datetime.datetime, session_type: str = 'windows', notification_token: Optional[str] = None):
    """
    Create a new login session in the database.
    """
    session = LoginSession(
        user_id=user.id,
        expires_at=_to_naive_utc(expires_at),
        notification_token=notification_token,
        refresh_expires_at=_to_naive_utc(datetime.datetime.now(datetime.UTC) + constants.REFRESH_TOKEN_LIFETIME_DELTA),
        login_session_type=session_type,
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    return session
