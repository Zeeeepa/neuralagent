from sqlmodel import create_engine, Session
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = ('postgresql://' + os.getenv('DB_USERNAME') + ':' + os.getenv('DB_PASSWORD') +
                '@' + os.getenv('DB_HOST') + ':' + os.getenv('DB_PORT') + '/' + os.getenv('DB_DATABASE')) \
    if not os.getenv('DB_CONNECTION_STRING') else os.getenv('DB_CONNECTION_STRING')

if 'postgresql+psycopg2' in DATABASE_URL:
    ASYNC_DATABASE_URL = DATABASE_URL.replace('postgresql+psycopg2://', 'postgresql+asyncpg://')
else:
    ASYNC_DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://')

engine = create_engine(DATABASE_URL, echo=True)

async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=True,
    future=True,
    pool_size=12,
    max_overflow=18,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(class_=Session, bind=engine, autocommit=False, autoflush=False)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

async def get_async_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()