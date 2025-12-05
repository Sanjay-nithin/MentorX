from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Header
from database import db
from utils.auth import get_password_hash, verify_password, create_access_token, create_refresh_token, verify_refresh_token, verify_access_token
from models.userModel import RegisterRequest, LoginRequest, UserPublic, AuthResponse, GoogleVerifyRequest, RefreshTokenRequest, UpdateProfileRequest, UpdatePersonalizationRequest

router = APIRouter(prefix='/users', tags=["Users"])


@router.post('/register', response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_user(payload: RegisterRequest) -> AuthResponse:
    # Enforce uniqueness: email, username, and phone (only if provided)
    or_filters = [
        {"email": payload.email.lower()},
        {"username": payload.username.strip()},
    ]
    if payload.phone:
        or_filters.append({"phone": payload.phone})

    existing = await db["users"].find_one({"$or": or_filters})
    if existing:
        # Determine which field conflicts
        if existing.get("email") == payload.email:
            field = "email"
        elif existing.get("username") == payload.username:
            field = "username"
        else:
            field = "phone"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{field.capitalize()} already in use. Please choose a different {field}."
        )

    try:
        hashed = get_password_hash(payload.password)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is too long. Please use a shorter password.")
    
    doc = {
        "email": payload.email.lower(),
        "username": payload.username.strip(),
        "password": hashed,
        "created_at": datetime.utcnow(),
    }
    # Only add phone if provided (sparse index)
    if payload.phone:
        doc["phone"] = payload.phone
    
    try:
        result = await db["users"].insert_one(doc)
    except Exception as e:
        # Handle duplicate key errors
        error_msg = str(e)
        if "duplicate key" in error_msg.lower():
            if "email" in error_msg:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use.")
            elif "username" in error_msg:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already in use.")
            elif "phone" in error_msg:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number already in use.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Registration failed. Please try again.")

    user_public = UserPublic(
        id=str(result.inserted_id),
        email=doc["email"],
        username=doc["username"],
        phone=doc.get("phone"),
        gender=None,
        firebase_uid=None,
        profile_image=None,
        focus_areas=None,
        struggling_topics=None,
        goal=None,
        expected_difficulty=None,
        created_at=doc["created_at"],
    )
    access_token = create_access_token({"sub": user_public.id, "email": user_public.email})
    refresh_token = create_refresh_token({"sub": user_public.id, "email": user_public.email})
    return AuthResponse(user=user_public, access_token=access_token, refresh_token=refresh_token)



@router.post('/login', response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
    user = await db["users"].find_one({"email": payload.email.lower()})
    try:
        valid = verify_password(payload.password, user.get("password", ""))
    except ValueError:
        valid = False
    if not user or not valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user_public = UserPublic(
        id=str(user["_id"]),
        email=user["email"],
        username=user["username"],
        phone=user.get("phone"),
        gender=user.get("gender"),
        firebase_uid=user.get("firebase_uid"),
        profile_image=user.get("profile_image"),
        focus_areas=user.get("focus_areas"),
        struggling_topics=user.get("struggling_topics"),
        goal=user.get("goal"),
        expected_difficulty=user.get("expected_difficulty"),
        created_at=user["created_at"],
    )
    access_token = create_access_token({"sub": user_public.id, "email": user_public.email})
    refresh_token = create_refresh_token({"sub": user_public.id, "email": user_public.email})
    return AuthResponse(user=user_public, access_token=access_token, refresh_token=refresh_token)

@router.get('/')
async def users_health():
    return {"message": "Users endpoint is healthy"}

@router.get('/me', response_model=UserPublic)
async def get_current_user(authorization: str | None = Header(default=None)) -> UserPublic:
    """Return the current authenticated user's public info.
    Expects Authorization: Bearer <access_token> header.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = verify_access_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    from bson import ObjectId
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return UserPublic(
        id=str(user["_id"]),
        email=user["email"],
        username=user["username"],
        phone=user.get("phone"),
        gender=user.get("gender"),
        firebase_uid=user.get("firebase_uid"),
        profile_image=user.get("profile_image"),
        focus_areas=user.get("focus_areas"),
        struggling_topics=user.get("struggling_topics"),
        goal=user.get("goal"),
        expected_difficulty=user.get("expected_difficulty"),
        created_at=user.get("created_at", datetime.utcnow()),
    )


@router.put('/profile', response_model=UserPublic)
async def update_profile(payload: UpdateProfileRequest, authorization: str | None = Header(default=None)) -> UserPublic:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        token_data = verify_access_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = token_data.get("sub")
    from bson import ObjectId
    users = db["users"]
    user = await users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update: dict = {"$set": {}}
    # Username uniqueness
    if payload.username is not None and payload.username.strip() and payload.username.strip() != user.get("username"):
        existing = await users.find_one({"username": payload.username.strip(), "_id": {"$ne": ObjectId(user_id)}})
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already in use.")
        update["$set"]["username"] = payload.username.strip()

    # Phone uniqueness and sparse handling
    if payload.phone is not None:
        phone_val = payload.phone.strip()
        if phone_val == "":
            # Unset phone when empty string provided
            update.setdefault("$unset", {})["phone"] = ""
        else:
            existing = await users.find_one({"phone": phone_val, "_id": {"$ne": ObjectId(user_id)}})
            if existing:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number already in use.")
            update["$set"]["phone"] = phone_val

    if payload.gender is not None:
        update["$set"]["gender"] = payload.gender

    if payload.profile_image is not None:
        update["$set"]["profile_image"] = payload.profile_image

    if not update["$set"] and "$unset" not in update:
        # Nothing to update
        updated = await users.find_one({"_id": ObjectId(user_id)})
    else:
        await users.update_one({"_id": ObjectId(user_id)}, update)
        updated = await users.find_one({"_id": ObjectId(user_id)})

    return UserPublic(
        id=str(updated["_id"]),
        email=updated["email"],
        username=updated["username"],
        phone=updated.get("phone"),
        gender=updated.get("gender"),
        firebase_uid=updated.get("firebase_uid"),
        profile_image=updated.get("profile_image"),
        focus_areas=updated.get("focus_areas"),
        struggling_topics=updated.get("struggling_topics"),
        goal=updated.get("goal"),
        expected_difficulty=updated.get("expected_difficulty"),
        created_at=updated.get("created_at", datetime.utcnow()),
    )


@router.put('/personalization', response_model=UserPublic)
async def update_personalization(payload: UpdatePersonalizationRequest, authorization: str | None = Header(default=None)) -> UserPublic:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        token_data = verify_access_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = token_data.get("sub")
    from bson import ObjectId
    users = db["users"]
    user = await users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    set_data: dict = {}
    if payload.focus_areas is not None:
        set_data["focus_areas"] = payload.focus_areas
    if payload.struggling_topics is not None:
        set_data["struggling_topics"] = payload.struggling_topics
    if payload.goal is not None:
        set_data["goal"] = payload.goal
    if payload.expected_difficulty is not None:
        set_data["expected_difficulty"] = payload.expected_difficulty

    if set_data:
        await users.update_one({"_id": ObjectId(user_id)}, {"$set": set_data})

    updated = await users.find_one({"_id": ObjectId(user_id)})
    return UserPublic(
        id=str(updated["_id"]),
        email=updated["email"],
        username=updated["username"],
        phone=updated.get("phone"),
        gender=updated.get("gender"),
        firebase_uid=updated.get("firebase_uid"),
        profile_image=updated.get("profile_image"),
        focus_areas=updated.get("focus_areas"),
        struggling_topics=updated.get("struggling_topics"),
        goal=updated.get("goal"),
        expected_difficulty=updated.get("expected_difficulty"),
        created_at=updated.get("created_at", datetime.utcnow()),
    )


@router.post('/refresh-token')
async def refresh_token(payload: RefreshTokenRequest):
    """
    Refresh access token using a valid refresh token.
    Returns a new access token (and optionally a new refresh token).
    """
    try:
        from bson import ObjectId
        
        # Verify the refresh token
        token_data = verify_refresh_token(payload.refresh_token)
        user_id = token_data.get("sub")
        email = token_data.get("email")
        
        if not user_id or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Verify user still exists
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User no longer exists"
            )
        
        # Generate new access token
        new_access_token = create_access_token({"sub": user_id, "email": email})
        
        # Optionally rotate refresh token (more secure but requires frontend to store new one)
        new_refresh_token = create_refresh_token({"sub": user_id, "email": email})
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
        
    except Exception as e:
        print(f"[refresh-token] Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )


@router.post('/google-verify', response_model=AuthResponse)
async def google_verify(payload: GoogleVerifyRequest) -> AuthResponse:
    uid = payload.uid
    email = (payload.email or '').lower()
    photo_url = payload.photo_url or ""
    display_name = payload.display_name or ""
    
    print(f"[google-verify] Received UID={uid} email={email}")
    if not uid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Firebase UID")

    users = db["users"]
    
    # Check if user exists by firebase_uid first, then by email
    user = await users.find_one({"firebase_uid": uid})
    if not user and email:
        user = await users.find_one({"email": email})
        # If found by email, update with firebase_uid
        if user:
            await users.update_one(
                {"_id": user["_id"]},
                {"$set": {"firebase_uid": uid, "profile_image": photo_url}}
            )
            user = await users.find_one({"_id": user["_id"]})

    if user:
        print(f"[google-verify] Existing user found for email={email}")
        user_public = UserPublic(
            id=str(user["_id"]),
            email=user["email"],
            username=user["username"],
            phone=user.get("phone"),
            gender=user.get("gender"),
            firebase_uid=user.get("firebase_uid"),
            profile_image=user.get("profile_image"),
            focus_areas=user.get("focus_areas"),
            struggling_topics=user.get("struggling_topics"),
            goal=user.get("goal"),
            expected_difficulty=user.get("expected_difficulty"),
            created_at=user.get("created_at", datetime.utcnow()),
        )
    else:
        if not email:
            print("[google-verify] No email provided by Firebase; returning error")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google account email not available. Please allow email access.")
        
        # Generate unique username
        username_base = display_name.replace(" ", "").lower() if display_name else email.split("@")[0]
        username = username_base[:20]
        
        # Ensure username is unique
        counter = 1
        original_username = username
        while await users.find_one({"username": username}):
            username = f"{original_username}{counter}"
            counter += 1
        
        doc = {
            "email": email,
            "username": username,
            "firebase_uid": uid,
            "profile_image": photo_url,
            "password": get_password_hash(uid),  # placeholder hashed
            "created_at": datetime.utcnow(),
            "source": "google",
        }
        
        try:
            result = await users.insert_one(doc)
            print(f"[google-verify] Created new user id={result.inserted_id} for email={doc['email']}")
        except Exception as e:
            print(f"[google-verify] Error creating user: {e}")
            error_msg = str(e)
            if "duplicate key" in error_msg.lower():
                if "firebase_uid" in error_msg:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This Google account is already registered.")
                elif "email" in error_msg:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Failed to create user account. Please try again."
            )
        
        user_public = UserPublic(
            id=str(result.inserted_id),
            email=doc["email"],
            username=doc["username"],
            phone=None,
            gender=None,
            firebase_uid=doc["firebase_uid"],
            profile_image=doc["profile_image"],
            focus_areas=None,
            struggling_topics=None,
            goal=None,
            expected_difficulty=None,
            created_at=doc["created_at"],
        )

    access_token = create_access_token({"sub": user_public.id, "email": user_public.email})
    refresh_token = create_refresh_token({"sub": user_public.id, "email": user_public.email})
    return AuthResponse(user=user_public, access_token=access_token, refresh_token=refresh_token)
