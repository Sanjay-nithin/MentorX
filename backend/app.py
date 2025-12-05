from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
from controllers import userController
from controllers import kgController
from controllers.quizController import router as quiz_router
from database import db
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure indexes exist (only email and firebase_uid are unique)
    try:
        existing_indexes = await db["users"].list_indexes().to_list(None)
        existing_names = {idx['name'] for idx in existing_indexes}
        
        # Only create indexes that don't exist
        if 'email_1' not in existing_names:
            await db["users"].create_index("email", unique=True)
            print("✓ Created email index (unique)")
        
        if 'firebase_uid_1' not in existing_names:
            await db["users"].create_index("firebase_uid", unique=True, sparse=True)
            print("✓ Created firebase_uid index (unique, sparse)")
        
        print("✓ Database ready")
    except Exception as e:
        print(f"⚠ Database setup warning: {e}")
    yield

app = FastAPI(title="MentorX API", version="1.0.0", lifespan=lifespan)
# Configure CORS using allowed origins from environment (comma-separated)
allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
origins = [o.strip() for o in allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["Authorization"],
)
app.include_router(userController.router)
app.include_router(kgController.router)
app.include_router(quiz_router)

@app.get('/')
def home():
    return {"message": "Welcome to MentorX API!"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="localhost", port=8000, reload=True)
