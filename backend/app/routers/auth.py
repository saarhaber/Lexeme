from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import timedelta
import os
import sys
sys.path.append('..')
from database import get_db
from ..models.user import User
from ..utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    decode_access_token,
    oauth2_scheme
)

def get_current_user_real(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Get current user with proper db injection."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
    
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "language_level": user.language_level
    }

# Google OAuth
try:
    from authlib.integrations.starlette_client import OAuth
    from starlette.config import Config
    GOOGLE_OAUTH_AVAILABLE = True
except ImportError:
    GOOGLE_OAUTH_AVAILABLE = False
    print("⚠️  Google OAuth not available. Install authlib: pip install authlib httpx")

router = APIRouter()

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    language_level: str

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        language_level="unknown",
        preferences={}
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        language_level=new_user.language_level
    )

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login and get access token."""
    # Find user by username
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username
    )

@router.post("/login-json", response_model=Token)
async def login_json(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login using JSON (alternative to OAuth2 form)."""
    try:
        user = db.query(User).filter(User.username == user_data.username).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user has a password (OAuth users might not)
        if not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account uses Google sign-in. Please use 'Sign in with Google'.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not verify_password(user_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "username": user.username},
            expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            username=user.username
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user_real),
    db: Session = Depends(get_db)
):
    """Get current user information."""
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        language_level=user.language_level
    )

@router.post("/logout")
async def logout():
    """Logout (client-side token removal)."""
    # JWT tokens are stateless, so logout is handled client-side
    # by removing the token from storage
    return {"message": "Logged out successfully"}

# Google OAuth endpoints
if GOOGLE_OAUTH_AVAILABLE:
    # Initialize OAuth
    config = Config()
    oauth = OAuth(config)
    
    # Get Google OAuth credentials from environment or use defaults
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
        oauth.register(
            name='google',
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
            client_kwargs={
                'scope': 'openid email profile'
            }
        )
        
        @router.get("/google/login")
        async def google_login(request: Request):
            """Initiate Google OAuth login."""
            redirect_uri = request.url_for('google_callback')
            return await oauth.google.authorize_redirect(request, redirect_uri)
        
        @router.get("/google/callback", name="google_callback")
        async def google_callback(request: Request, db: Session = Depends(get_db)):
            """Handle Google OAuth callback."""
            try:
                token = await oauth.google.authorize_access_token(request)
                user_info = token.get('userinfo')
                
                if not user_info:
                    raise HTTPException(status_code=400, detail="Failed to get user info from Google")
                
                email = user_info.get('email')
                name = user_info.get('name', '')
                google_id = user_info.get('sub')
                
                if not email:
                    raise HTTPException(status_code=400, detail="Email not provided by Google")
                
                # Check if user exists
                user = db.query(User).filter(User.email == email).first()
                
                if not user:
                    # Create new user
                    username = email.split('@')[0]  # Use email prefix as username
                    # Ensure username is unique
                    base_username = username
                    counter = 1
                    while db.query(User).filter(User.username == username).first():
                        username = f"{base_username}{counter}"
                        counter += 1
                    
                    user = User(
                        username=username,
                        email=email,
                        password_hash="",  # No password for OAuth users
                        language_level="unknown",
                        preferences={"google_id": google_id, "name": name}
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
                
                # Create JWT token
                access_token = create_access_token(data={"sub": str(user.id), "username": user.username})
                
                # Redirect to frontend with token
                frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3003")
                return RedirectResponse(
                    url=f"{frontend_url}/auth/callback?token={access_token}&user_id={user.id}&username={user.username}"
                )
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"OAuth error: {str(e)}")
    else:
        @router.get("/google/login")
        async def google_login_disabled():
            """Google OAuth not configured."""
            raise HTTPException(
                status_code=501,
                detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
            )
else:
    @router.get("/google/login")
    async def google_login_disabled():
        """Google OAuth not available."""
        raise HTTPException(
            status_code=501,
            detail="Google OAuth not available. Install authlib: pip install authlib httpx"
        )
