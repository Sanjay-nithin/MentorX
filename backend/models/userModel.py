from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
	email: EmailStr
	username: str = Field(min_length=3, max_length=30)
	phone: str | None = Field(default=None, pattern=r"^[0-9]{10,15}$", description="Digits only, 10-15 characters")
	password: str = Field(min_length=5)


class LoginRequest(BaseModel):
	email: EmailStr
	password: str


class UserPublic(BaseModel):
	id: str
	email: EmailStr
	username: str
	phone: str | None = None
	gender: str | None = None
	firebase_uid: str | None = None
	profile_image: str | None = None
	focus_areas: list[str] | None = None
	struggling_topics: list[str] | None = None
	goal: str | None = None
	expected_difficulty: str | None = None
	created_at: datetime


class AuthResponse(BaseModel):
	user: UserPublic
	access_token: str
	refresh_token: str
	token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
	refresh_token: str


class GoogleVerifyRequest(BaseModel):
	uid: str
	email: EmailStr | None = None
	photo_url: str | None = None
	display_name: str | None = None


class UpdateProfileRequest(BaseModel):
	username: str | None = Field(default=None, min_length=3, max_length=30)
	phone: str | None = Field(default=None, pattern=r"^[0-9]{10,15}$")
	gender: str | None = None
	profile_image: str | None = None


class UpdatePersonalizationRequest(BaseModel):
	focus_areas: list[str] | None = None
	struggling_topics: list[str] | None = None
	goal: str | None = None
	expected_difficulty: str | None = None
