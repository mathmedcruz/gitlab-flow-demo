import os

from fastapi import FastAPI

APP_NAME = "gitlab-flow-demo"
APP_VERSION = os.getenv("APP_VERSION", "dev")
APP_ENV = os.getenv("APP_ENV", "local")

app = FastAPI(title=APP_NAME, version=APP_VERSION)


@app.get("/")
def root():
    return {
        "app": APP_NAME,
        "message": "Olá, mundo! Bem-vindo ao GitLab Flow Demo Matheus. oi camila. oi mario",
        "environment": APP_ENV,
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/version")
def version():
    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "environment": APP_ENV,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "3000")),
    )
