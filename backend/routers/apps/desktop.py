from fastapi import APIRouter


router = APIRouter(
    prefix='/apps/neuralagent_desktop',
    tags=['apps', 'neuralagent_desktop'],
)


@router.get("/latest_version")
async def neuralagent_latest_version():
    return {
        "version": "1.7.1",
        "download_url": "https://www.getneuralagent.com/downloads",
        "release_notes": "Introducing The NeuralAgent LIVE Feed.",
        "required": False
    }
