from sqlmodel import create_engine, Session
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

# Keep the synchronous setup for migrations and other sync operations
DATABASE_URL = ('postgresql://' + os.getenv('DB_USERNAME') + ':' + os.getenv('DB_PASSWORD') +
                '@' + os.getenv('DB_HOST') + ':' + os.getenv('DB_PORT') + '/' + os.getenv('DB_DATABASE')) \
    if not os.getenv('DB_CONNECTION_STRING') else os.getenv('DB_CONNECTION_STRING')

# Async database URL - handle Cloud SQL Unix socket format
if 'cloudsql' in DATABASE_URL:
    # For Cloud SQL with Unix socket, replace psycopg2 with asyncpg
    ASYNC_DATABASE_URL = DATABASE_URL.replace('postgresql+psycopg2://', 'postgresql+asyncpg://')
else:
    # For regular connections
    ASYNC_DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://')

# Synchronous engine (keep for migrations, scripts, etc.)
engine = create_engine(DATABASE_URL, echo=True)

# Async engine
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=True,
    future=True,
    pool_size=20,  # Adjust based on your needs
    max_overflow=40,  # Adjust based on your needs
    pool_pre_ping=True,  # Verify connections before using
)

# Synchronous session (keep for backward compatibility)
SessionLocal = sessionmaker(class_=Session, bind=engine, autocommit=False, autoflush=False)

# Async session
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Synchronous dependency (keep for endpoints that haven't been converted yet)
def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

# Async dependency for async endpoints
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