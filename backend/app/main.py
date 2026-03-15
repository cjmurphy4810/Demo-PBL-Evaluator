from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import entitlements, evaluate, reports, config as config_router

app = FastAPI(
    title=settings.app_name,
    description="Plain Business Language Quality & Tier Classification Platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://cjmurphy4810.github.io",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(entitlements.router, prefix="/api/v1/entitlements", tags=["entitlements"])
app.include_router(evaluate.router, prefix="/api/v1/evaluate", tags=["evaluate"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(config_router.router, prefix="/api/v1/config", tags=["config"])


@app.get("/health")
def health_check():
    return {"status": "healthy", "app": settings.app_name}
