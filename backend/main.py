from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Query, Request, Header, Body, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional, Annotated, Tuple
from datetime import datetime, timedelta, timezone
import jwt
import os
import logging
from pydantic import BaseModel, EmailStr, Field, validator
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text, text, Float, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import uuid
import json
from fastapi.responses import JSONResponse
import shutil
from pathlib import Path
from fastapi.staticfiles import StaticFiles
import requests
from math import radians, sin, cos, sqrt, atan2
import googlemaps
from sqlalchemy import inspect
import pytz

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


DATABASE_URL = "postgresql://postgres:rv@localhost:5432/CommunityPulse"
CLERK_SECRET_KEY = "sk_test_OTSjCgK3YwYAPsR9y8NDjbmJOAlDy6pogqa4MHxL3u"  # Replace with your Clerk secret key
CLERK_PEM_PUBLIC_KEY = """
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA42smZzN37TQeHCCWIHom
HEqntoKVVHYJYSFg5+qIYRVRb4GVrNDMmPfcrUKT/S7Hw3wOsr0AFBPVjAXPQmF3
e05STUh8zh0pTHFJFb72ythK9TUl9zpMa61gU6I6zxnpsXiN37Pn5MoC2raWyyUr
MvmnL0YM2sgE2v02gk/VIR3uWQuD3kS/heVNfZTuREV6pWyw3M//ywNwl/2sG7pX
iGZvHBlAGPXVP61cjDhSj+Hlvyd8kOfFKJh3Dwa0WgEF0rGke8ksdOmYZOFfm/ba
r/s7K4mjQRxZVr2cHBcYVKxiK+/gG8SvJ8MKhyE2PDP1ae6vZfB6YI9THUSMUfHF
8wIDAQAB
-----END PUBLIC KEY-----
"""  # Replace with your Clerk JWT public key

# Define admin email
ADMIN_EMAIL = "rohithvishwanath1789@gmail.com"

# Add after other imports
import googlemaps

# Add after other configuration constants
GOOGLE_MAPS_API_KEY = "AIzaSyD69HwBjD9rZvbVVgumIWVG94TSIiQJDd0" 
gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)

# Add after other configuration constants
IST = pytz.timezone('Asia/Kolkata')

# Database setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Create app
app = FastAPI(title="Community Pulse API")

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:3000",  # NextJS default port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Clerk authentication
security = HTTPBearer(auto_error=False)

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    clerk_id = Column(String, unique=True, index=True)
    username = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    is_admin = Column(Boolean, default=False)
    is_verified_organizer = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_banned = Column(Boolean, default=False)
    
    # Relationships
    events = relationship("Event", back_populates="organizer")
    event_registrations = relationship("EventRegistration", back_populates="user")
    event_likes = relationship("EventLike", back_populates="user")
    event_reports = relationship("EventReport", back_populates="user")
    reported_issues = relationship("Issue", back_populates="reporter")
    issue_votes = relationship("IssueVote", back_populates="user")

class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    location = Column(Text)  # This will store the formatted address
    latitude = Column(Float, nullable=True)  # Changed to Float
    longitude = Column(Float, nullable=True)  # Changed to Float
    category = Column(String, index=True)
    type = Column(String, default="Free")  # New column for reg fee/Free
    price = Column(Float, default=0.0)  # Price per person for paid events
    views = Column(Integer, default=0)  # New column for view count
    start_date = Column(DateTime, index=True)
    end_date = Column(DateTime, index=True)
    registration_start = Column(DateTime)
    registration_end = Column(DateTime)
    image_path = Column(String, nullable=True)
    organizer_id = Column(Integer, ForeignKey("users.id"))
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    attendees_count = Column(Integer, default=0)
    
    # Relationships
    organizer = relationship("User", back_populates="events")
    registrations = relationship("EventRegistration", back_populates="event", cascade="all, delete-orphan")
    likes = relationship("EventLike", back_populates="event", cascade="all, delete-orphan")
    reports = relationship("EventReport", back_populates="event", cascade="all, delete-orphan")

class EventRegistration(Base):
    __tablename__ = "event_registrations"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="interested")  # "interested", "registered", "cancelled"
    attendees = Column(Text)  # JSON string containing array of attendee names
    number_of_attendees = Column(Integer, default=1)
    registered_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    event = relationship("Event", back_populates="registrations")
    user = relationship("User", back_populates="event_registrations")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    notification_type = Column(String)  # "reminder", "update", "cancellation"
    created_at = Column(DateTime, default=datetime.utcnow)
    
class EventLike(Base):
    __tablename__ = "event_likes"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    event = relationship("Event", back_populates="likes")
    user = relationship("User", back_populates="event_likes")

class EventReport(Base):
    __tablename__ = "event_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending")  # pending, reviewed, dismissed
    
    # Relationships
    event = relationship("Event", back_populates="reports")
    user = relationship("User", back_populates="event_reports")
    
class EventView(Base):
    __tablename__ = "event_views"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"))
    viewed_at = Column(DateTime, default=datetime.utcnow)
    
class Issue(Base):
    __tablename__ = "issues"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    location = Column(Text)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    category = Column(String, index=True)  # e.g., "Road", "Sanitation", "Public Safety"
    status = Column(String, default="pending")  # pending, approved, resolved, rejected
    image_path = Column(String, nullable=True)
    reporter_id = Column(Integer, ForeignKey("users.id"))
    is_approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    votes_count = Column(Integer, default=0)
    
    # Relationships
    reporter = relationship("User", back_populates="reported_issues")
    votes = relationship("IssueVote", back_populates="issue", cascade="all, delete-orphan")

class IssueVote(Base):
    __tablename__ = "issue_votes"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    issue = relationship("Issue", back_populates="votes")
    user = relationship("User", back_populates="issue_votes")

# Create all tables
Base.metadata.create_all(bind=engine)

# Add latitude and longitude columns if they don't exist
def add_location_columns():
    db = SessionLocal()
    try:
        # Check if columns exist
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='events' AND column_name IN ('latitude', 'longitude')
        """)).fetchall()
        existing_columns = [row[0] for row in result]
        
        # Add latitude column if it doesn't exist
        if 'latitude' not in existing_columns:
            db.execute(text("ALTER TABLE events ADD COLUMN latitude FLOAT"))
            logger.info("Added latitude column to events table")
        
        # Add longitude column if it doesn't exist
        if 'longitude' not in existing_columns:
            db.execute(text("ALTER TABLE events ADD COLUMN longitude FLOAT"))
            logger.info("Added longitude column to events table")
        
        db.commit()
    except Exception as e:
        logger.error(f"Error adding location columns: {e}")
        db.rollback()
    finally:
        db.close()

# Call the function to add columns
add_location_columns()

# Setup admin user on startup
@app.on_event("startup")
async def setup_admin():
    db = SessionLocal()
    try:
        # Find user by email
        admin_user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        
        if admin_user:
            # Set as admin if not already
            if not admin_user.is_admin:
                admin_user.is_admin = True
                db.commit()
                logger.info(f"User {admin_user.email} set as admin")
        else:
            logger.info(f"Admin user {ADMIN_EMAIL} not found in database yet")
    except Exception as e:
        logger.error(f"Error setting up admin user: {e}")
    finally:
        db.close()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Models (Request & Response Models)
class UserResponse(BaseModel):
    id: int
    clerk_id: str
    username: str
    email: str
    phone: Optional[str] = None
    is_admin: bool
    is_verified_organizer: bool
    
    class Config:
        from_attributes = True

class EventCreate(BaseModel):
    title: str
    description: str
    location: str
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    category: str
    type: str = "Free"  # New field with default value
    price: float = 0.0  # Price per person for paid events
    start_date: datetime
    end_date: datetime
    registration_start: datetime
    registration_end: datetime

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = None  # New field
    price: Optional[float] = None  # Price per person for paid events
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    registration_start: Optional[datetime] = None
    registration_end: Optional[datetime] = None

class EventResponse(BaseModel):
    id: int
    title: str
    description: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: str
    type: str  # New field
    price: float  # Price per person for paid events
    views: int  # New field
    start_date: datetime
    end_date: datetime
    registration_start: datetime
    registration_end: datetime
    image_path: Optional[str] = None
    organizer_id: int
    is_approved: bool
    created_at: datetime
    updated_at: datetime
    attendees_count: int
    is_registered: Optional[bool] = None
    organizer: UserResponse
    likes_count: int = 0
    is_liked: Optional[bool] = None
    distance: Optional[float] = None  # Distance in kilometers
    
    class Config:
        from_attributes = True

class EventRegistrationCreate(BaseModel):
    number_of_attendees: int = Field(ge=1, description="Number of attendees must be at least 1")
    attendees: List[dict] = Field(
        ...,
        description="List of attendee details including name, age, and phone"
    )

    @validator("attendees")
    def validate_attendees(cls, v):
        if not all(isinstance(attendee, dict) for attendee in v):
            raise ValueError("Each attendee must be a dictionary")
        
        if not all(
            isinstance(attendee.get("name"), str) and 
            isinstance(attendee.get("age"), (int, str)) and 
            isinstance(attendee.get("phone"), str)
            for attendee in v
        ):
            raise ValueError("Each attendee must have a name, age, and phone number")
        
        # Convert age to int if it's a string
        for attendee in v:
            if isinstance(attendee.get("age"), str):
                try:
                    attendee["age"] = int(attendee["age"])
                except (ValueError, TypeError):
                    raise ValueError("Age must be a valid number")
        
        if len(v) > 10:
            raise ValueError("Maximum 10 attendees allowed per registration")
        return v

    @validator("number_of_attendees")
    def validate_number_of_attendees(cls, v, values):
        if "attendees" in values and v != len(values["attendees"]):
            raise ValueError("Number of attendees must match the length of attendees list")
        return v

class EventRegistrationResponse(BaseModel):
    id: int
    event_id: int
    user_id: Optional[int] = None
    status: str
    attendees: List[str]
    number_of_attendees: int
    registered_at: datetime
    
    class Config:
        from_attributes = True

class AdminUserUpdate(BaseModel):
    is_admin: Optional[bool] = None
    is_verified_organizer: Optional[bool] = None
    is_banned: Optional[bool] = None

# Clerk authentication helpers
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    
    try:
        # Verify the token with Clerk, with leeway for iat validation
        payload = jwt.decode(
            token, 
            key=CLERK_PEM_PUBLIC_KEY, 
            algorithms=['RS256'],
            options={"verify_iat": False}
        )
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get or create user in our database
        user = db.query(User).filter(User.clerk_id == clerk_user_id).first()
        
        if not user:
            # Fetch user details from Clerk
            headers = {
                "Authorization": f"Bearer {CLERK_SECRET_KEY}",
                "Content-Type": "application/json"
            }
            clerk_user_response = requests.get(
                f"https://api.clerk.dev/v1/users/{clerk_user_id}",
                headers=headers
            )
            
            if clerk_user_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Failed to verify user with Clerk",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            clerk_user_data = clerk_user_response.json()
            
            # Create a new user in our database
            primary_email = next((email for email in clerk_user_data.get("email_addresses", []) 
                                    if email.get("id") == clerk_user_data.get("primary_email_address_id")), {})
            
            email_address = primary_email.get("email_address", "")
            
            # Check if this is the admin email
            is_admin = email_address == ADMIN_EMAIL
            
            user = User(
                clerk_id=clerk_user_id,
                username=clerk_user_data.get("username") or f"user_{clerk_user_id}",
                email=email_address,
                phone=clerk_user_data.get("phone_number", ""),
                is_admin=is_admin
            )
            
            db.add(user)
            db.commit()
            db.refresh(user)
            
            logger.info(f"Created new user: {user.email}, admin: {user.is_admin}")
        else:
            # Check if this is the admin email and update if needed
            if user.email == ADMIN_EMAIL and not user.is_admin:
                user.is_admin = True
                db.commit()
                db.refresh(user)
                logger.info(f"Updated user {user.email} to admin status")
        
        if user.is_banned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is banned from the platform"
            )
        
        return user
        
    except jwt.PyJWTError as e:
        logger.error(f"JWT error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication error"
        )

async def get_admin_user(current_user: User = Depends(get_current_user)):
    logger.info(f"Admin check for user: {current_user.email}, is_admin: {current_user.is_admin}")
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

async def get_current_user_or_none(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    if not credentials:
        return None
        
    token = credentials.credentials
    
    try:
        # Verify the token with Clerk, with leeway for iat validation
        payload = jwt.decode(
            token, 
            key=CLERK_PEM_PUBLIC_KEY, 
            algorithms=['RS256'],
            options={"verify_iat": False}
        )
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            return None
        
        # Get user from database
        user = db.query(User).filter(User.clerk_id == clerk_user_id).first()
        if not user or user.is_banned:
            return None
            
        return user
        
    except:
        return None

# User endpoints
@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# Event endpoints
@app.post("/events", response_model=EventResponse)
async def create_event(
    title: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    category: str = Form(...),
    type: str = Form("Free"),
    price: float = Form(0.0),
    start_date: str = Form(...),
    end_date: str = Form(...),
    registration_start: str = Form(...),
    registration_end: str = Form(...),
    image: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Log the incoming request data
    logger.info(f"Creating event - Received dates: start_date={start_date}, end_date={end_date}, reg_start={registration_start}, reg_end={registration_end}")
    logger.info(f"Received coordinates: lat={latitude}, lng={longitude}")
    
    # Parse datetime strings and convert to IST
    try:
        start_date_dt = datetime.fromisoformat(start_date).astimezone(IST)
        end_date_dt = datetime.fromisoformat(end_date).astimezone(IST)
        registration_start_dt = datetime.fromisoformat(registration_start).astimezone(IST)
        registration_end_dt = datetime.fromisoformat(registration_end).astimezone(IST)
        logger.info(f"Parsed dates (IST): start={start_date_dt}, end={end_date_dt}, reg_start={registration_start_dt}, reg_end={registration_end_dt}")
    except ValueError as e:
        logger.error(f"Date parsing error: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail=f"Invalid date format: {str(e)}"
        )
    
    # Get coordinates from location if not provided or invalid
    if latitude is None or longitude is None:
        lat, lng = get_coordinates_from_location(location)
        if lat and lng:
            latitude = lat
            longitude = lng
            logger.info(f"Using geocoded coordinates for location {location}: ({lat}, {lng})")
        else:
            # If geocoding fails, set to None
            latitude = None
            longitude = None
            logger.warning(f"Could not geocode coordinates for location: {location}")
    
    # Create event
    db_event = Event(
        title=title,
        description=description,
        location=location,
        latitude=latitude,
        longitude=longitude,
        category=category,
        type=type,
        price=price,
        start_date=start_date_dt,
        end_date=end_date_dt,
        registration_start=registration_start_dt,
        registration_end=registration_end_dt,
        organizer_id=current_user.id,
        is_approved=current_user.is_verified_organizer,
        attendees_count=0
    )
    
    # Handle image upload if provided
    if image:
        # Create a unique filename
        file_extension = image.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{file_extension}"
        file_location = f"uploads/{filename}"
        
        # Save the file
        with open(file_location, "wb") as file_object:
            shutil.copyfileobj(image.file, file_object)
        
        db_event.image_path = file_location
    
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    logger.info(f"Created event: {db_event.id}, approved: {db_event.is_approved}, coordinates: ({db_event.latitude}, {db_event.longitude})")
    
    return db_event

@app.get("/events", response_model=List[EventResponse])
def get_events(
    category: Optional[str] = None,
    upcoming: bool = False,
    past: bool = False,
    approved_only: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(Event)
    
    # Filter by approval status
    if approved_only:
        query = query.filter(Event.is_approved == True)
    
    # Filter by category if provided
    if category:
        query = query.filter(Event.category == category)
    
    # Filter for upcoming or past events
    if upcoming:
        query = query.filter(Event.start_date >= datetime.utcnow())
    elif past:
        query = query.filter(Event.end_date < datetime.utcnow())
    
    # Sort by start date
    events = query.order_by(Event.start_date.desc() if past else Event.start_date.asc()).all()
    
    logger.info(f"Fetched {len(events)} events (approved_only={approved_only}, past={past})")
    
    return events

@app.get("/events/nearby", response_model=List[EventResponse])
async def get_nearby_events(
    latitude: float,  # Changed to float
    longitude: float,  # Changed to float
    max_distance: float = 10.0,
    db: Session = Depends(get_db)
):
    """
    Get events within a specified radius (in kilometers) from the given coordinates.
    """
    logger.info(f"Fetching nearby events. User coordinates: lat={latitude}, lon={longitude}")
    
    # Get all approved events with coordinates
    events = db.query(Event).filter(
        Event.is_approved == True,
        Event.latitude.isnot(None),
        Event.longitude.isnot(None)
    ).all()
    
    logger.info(f"Found {len(events)} total approved events with coordinates")
    
    nearby_events = []
    
    for event in events:
        try:
            distance = calculate_distance(
                str(latitude), str(longitude),  # Convert to string for calculate_distance
                str(event.latitude), str(event.longitude)
            )
            
            logger.info(f"Event {event.id} ({event.title}) - Distance: {distance}km")
            
            if distance <= max_distance:
                event_dict = EventResponse.model_validate(event).model_dump()
                event_dict["distance"] = round(distance, 2)  # Round to 2 decimal places
                nearby_events.append(event_dict)
                logger.info(f"Added event {event.id} to nearby events (distance: {distance}km)")
        except (ValueError, TypeError) as e:
            logger.error(f"Error calculating distance for event {event.id}: {e}")
            continue
    
    logger.info(f"Found {len(nearby_events)} nearby events within {max_distance}km")
    
    # Sort by distance
    nearby_events.sort(key=lambda x: x["distance"])
    
    return nearby_events

@app.get("/events/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    return event

@app.put("/events/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    category: Optional[str] = Form(None),
    type: Optional[str] = Form(None),  # New field
    price: Optional[float] = Form(None),  # Price per person for paid events
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    registration_start: Optional[str] = Form(None),
    registration_end: Optional[str] = Form(None),
    image: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch event
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Check if user is organizer or admin
    if event.organizer_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this event"
        )
    
    # Update fields if provided
    if title:
        event.title = title
    if description:
        event.description = description
    if location:
        event.location = location
        # If location is updated, try to get new coordinates
        if not latitude and not longitude:
            lat, lng = get_coordinates_from_location(location)
            if lat and lng:
                event.latitude = lat
                event.longitude = lng
                logger.info(f"Updated coordinates for location {location}: ({lat}, {lng})")
    if latitude is not None:
        event.latitude = latitude
    if longitude is not None:
        event.longitude = longitude
    if category:
        event.category = category
    if type:
        event.type = type
    if price:
        event.price = price
    if start_date:
        event.start_date = datetime.fromisoformat(start_date).astimezone(IST)
    if end_date:
        event.end_date = datetime.fromisoformat(end_date).astimezone(IST)
    if registration_start:
        event.registration_start = datetime.fromisoformat(registration_start).astimezone(IST)
    if registration_end:
        event.registration_end = datetime.fromisoformat(registration_end).astimezone(IST)
    
    # Handle image upload if provided
    if image:
        # Delete old image if exists
        if event.image_path and os.path.exists(event.image_path):
            os.remove(event.image_path)
        
        # Create a unique filename
        file_extension = image.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{file_extension}"
        file_location = f"uploads/{filename}"
        
        # Save the file
        with open(file_location, "wb") as file_object:
            shutil.copyfileobj(image.file, file_object)
        
        event.image_path = file_location
    
    # Update timestamp
    event.updated_at = datetime.utcnow()
    
    # Non-verified organizers need re-approval after updates
    if not current_user.is_verified_organizer and not current_user.is_admin:
        event.is_approved = False
    
    db.commit()
    db.refresh(event)
    
    logger.info(f"Updated event {event.id}, new coordinates: ({event.latitude}, {event.longitude})")
    
    return event

@app.delete("/events/{event_id}")
async def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch event
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Check if user is organizer or admin
    if event.organizer_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this event"
        )
    
    # Create cancellation notifications for registered users
    for registration in event.registrations:
        notification = Notification(
            event_id=event.id,
            user_id=registration.user_id,
            title="Event Cancelled",
            message=f"The event '{event.title}' has been cancelled.",
            notification_type="cancellation"
        )
        db.add(notification)
    
    # Delete the event image if it exists
    if event.image_path and os.path.exists(event.image_path):
        try:
            os.remove(event.image_path)
        except:
            pass
    
    # Delete the event
    db.delete(event)
    db.commit()
    
    return {"message": "Event deleted successfully"}

# Event Registration endpoints
@app.post("/events/{event_id}/register", response_model=EventRegistrationResponse)
async def register_for_event(
    event_id: int,
    registration: EventRegistrationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch event
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    if not event.is_approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot register for an unapproved event"
        )
    
    # Check if registration period is open
    now = datetime.now(IST)
    if now < event.registration_start or now > event.registration_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration is not open for this event"
        )
    
    # Check if already registered
    existing_registration = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.user_id == current_user.id
    ).first()
    
    if existing_registration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already registered for this event"
        )
    
    # Create registration
    db_registration = EventRegistration(
        event_id=event_id,
        user_id=current_user.id,
        status="registered",
        attendees=json.dumps(registration.attendees),
        number_of_attendees=registration.number_of_attendees
    )
    
    db.add(db_registration)
    
    # Update attendees count
    event.attendees_count = event.attendees_count + registration.number_of_attendees
    
    db.commit()
    db.refresh(db_registration)
    
    # Create reminder notification
    reminder_date = event.start_date - timedelta(days=1)
    if reminder_date > now:
        notification = Notification(
            event_id=event.id,
            user_id=current_user.id,
            title="Event Reminder",
            message=f"Reminder: The event '{event.title}' is tomorrow!",
            notification_type="reminder"
        )
        db.add(notification)
        db.commit()
    
    return db_registration

@app.post("/events/{event_id}/interest")
async def mark_interest(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch event
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    if not event.is_approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot show interest in an unapproved event"
        )
    
    # Check if already registered
    existing_registration = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.user_id == current_user.id
    ).first()
    
    if existing_registration:
        if existing_registration.status == "cancelled":
            # Reactivate interest
            existing_registration.status = "interested"
            event.attendees_count = event.attendees_count + 1  # Add 1 for interested status
            db.commit()
            return {"message": "Interest marked successfully", "registration_id": existing_registration.id}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already interested or registered for this event"
            )
    
    # Create a registration with "interested" status
    db_registration = EventRegistration(
        event_id=event_id,
        user_id=current_user.id,
        status="interested",
        attendees=json.dumps([current_user.username]),
        number_of_attendees=1  # Start with 1 for interested status
    )
    
    db.add(db_registration)
    event.attendees_count = event.attendees_count + 1  # Add 1 for interested status
    db.commit()
    db.refresh(db_registration)
    
    return {"message": "Interest marked successfully", "registration_id": db_registration.id}

@app.post("/events/{event_id}/confirm-registration")
async def confirm_registration(
    event_id: int,
    registration_data: EventRegistrationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Log the incoming request data
    logger.info(f"Received registration confirmation request for event {event_id}")
    logger.info(f"Registration data: {registration_data.dict()}")
    logger.info(f"Number of attendees: {registration_data.number_of_attendees}")
    logger.info(f"Attendees: {registration_data.attendees}")
    
    # Fetch event
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        logger.error(f"Event {event_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Get existing registration
    registration = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.user_id == current_user.id
    ).first()
    
    if not registration or registration.status == "cancelled":
        logger.error(f"No existing interest found for user {current_user.id} in event {event_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must first mark interest in this event"
        )
    
    if registration.status == "registered":
        logger.error(f"User {current_user.id} is already registered for event {event_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already registered for this event"
        )
    
    try:
        # Update registration
        old_attendees_count = registration.number_of_attendees
        registration.status = "registered"
        registration.attendees = json.dumps(registration_data.attendees)
        registration.number_of_attendees = registration_data.number_of_attendees
        
        # Update event attendees count
        event.attendees_count = event.attendees_count - old_attendees_count + registration_data.number_of_attendees
        
        db.commit()
        db.refresh(registration)
        
        # Create reminder notification
        now = datetime.now(IST)
        event_start_date = event.start_date.astimezone(IST)
        reminder_date = event_start_date - timedelta(days=1)
        
        if reminder_date > now:
            notification = Notification(
                event_id=event.id,
                user_id=current_user.id,
                title="Event Reminder",
                message=f"Reminder: The event '{event.title}' is tomorrow!",
                notification_type="reminder"
            )
            db.add(notification)
            db.commit()
        
        logger.info(f"Successfully registered user {current_user.id} for event {event_id}")
        return registration
    except Exception as e:
        logger.error(f"Error during registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )

@app.post("/events/{event_id}/cancel-registration")
async def cancel_registration(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch registration
    registration = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.user_id == current_user.id
    ).first()
    
    if not registration or registration.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration not found"
        )
    
    # Update event attendees count
    event = registration.event
    event.attendees_count = max(0, event.attendees_count - registration.number_of_attendees)
    
    # Update registration status
    registration.status = "cancelled"
    
    db.commit()
    
    return {"message": "Registration cancelled successfully"}

@app.get("/user/events/registered", response_model=List[EventResponse])
async def get_user_registered_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    registrations = db.query(EventRegistration).filter(
        EventRegistration.user_id == current_user.id,
        EventRegistration.status == "registered"
    ).all()
    events = [registration.event for registration in registrations]
    return events

@app.get("/user/events/interested", response_model=List[EventResponse])
async def get_user_interested_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    registrations = db.query(EventRegistration).filter(
        EventRegistration.user_id == current_user.id,
        EventRegistration.status == "interested"
    ).all()
    events = [registration.event for registration in registrations]
    return events

@app.get("/events/{event_id}/registration-status")
async def get_registration_status(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    registration = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.user_id == current_user.id
    ).first()
    
    if not registration or registration.status == "cancelled":
        return {
            "status": "none",
            "registration": None
        }
    
    return {
        "status": registration.status,
        "registration": {
            "id": registration.id,
            "attendees": json.loads(registration.attendees),
            "number_of_attendees": registration.number_of_attendees,
            "registered_at": registration.registered_at
        }
    }

# Admin endpoints
@app.get("/admin/events/pending", response_model=List[EventResponse])
async def get_pending_events(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    events = db.query(Event).filter(Event.is_approved == False).all()
    logger.info(f"Found {len(events)} pending events for admin {admin_user.email}")
    return events

@app.put("/admin/events/{event_id}/approve")
async def approve_event(
    event_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event.is_approved = True
    db.commit()
    
    logger.info(f"Admin {admin_user.email} approved event {event_id}")
    
    return {"message": "Event approved successfully"}

@app.put("/admin/events/{event_id}/reject")
async def reject_event(
    event_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Option 1: Delete the event
    db.delete(event)
    db.commit()
    
    logger.info(f"Admin {admin_user.email} rejected event {event_id}")
    
    return {"message": "Event rejected and deleted successfully"}

@app.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return users

@app.put("/admin/users/{user_id}")
async def update_user_status(
    user_id: int,
    user_update: AdminUserUpdate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user_update.is_admin is not None:
        user.is_admin = user_update.is_admin
    
    if user_update.is_verified_organizer is not None:
        user.is_verified_organizer = user_update.is_verified_organizer
    
    if user_update.is_banned is not None:
        user.is_banned = user_update.is_banned
    
    db.commit()
    
    return {"message": "User updated successfully"}

@app.put("/admin/users/{user_id}/verify-organizer")
async def verify_organizer(
    user_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_verified_organizer = True
    db.commit()
    
    logger.info(f"Admin {admin_user.email} verified user {user.email} as organizer")
    
    return {"message": "User verified as organizer successfully"}

@app.get("/admin/events/user/{user_id}", response_model=List[EventResponse])
async def get_user_events(
    user_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    events = db.query(Event).filter(Event.organizer_id == user_id).all()
    return events

# My events endpoint (for users to see their own events)
@app.get("/my-events", response_model=List[EventResponse])
async def get_my_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = db.query(Event).filter(Event.organizer_id == current_user.id).all()
    return events

# My registrations endpoint
@app.get("/my-registrations", response_model=List[EventRegistrationResponse])
async def get_my_registrations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    registrations = db.query(EventRegistration).filter(
        EventRegistration.user_id == current_user.id
    ).all()
    
    return registrations

# Notifications endpoints
@app.get("/notifications")
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).order_by(Notification.created_at.desc()).all()
    
    return notifications

@app.put("/notifications/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.is_read = True
    db.commit()
    
    return {"message": "Notification marked as read"}

# Search events endpoint
@app.get("/search", response_model=List[EventResponse])
def search_events(
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    events = db.query(Event).filter(
        Event.is_approved == True,
        (
            Event.title.ilike(f"%{query}%") |
            Event.description.ilike(f"%{query}%") |
            Event.location.ilike(f"%{query}%") |
            Event.category.ilike(f"%{query}%")
        )
    ).order_by(Event.start_date).all()
    
    return events

# Clerk webhook endpoint for syncing user data
@app.post("/clerk-webhook")
async def clerk_webhook(request: Request, db: Session = Depends(get_db)):
    # Verify webhook signature (in production, you should validate the webhook signature)
    payload = await request.json()
    event_type = payload.get("type")
    
    if event_type == "user.created" or event_type == "user.updated":
        data = payload.get("data", {})
        clerk_user_id = data.get("id")
        
        if not clerk_user_id:
            return {"status": "error", "message": "Invalid webhook payload"}
        
        # Get or create user
        user = db.query(User).filter(User.clerk_id == clerk_user_id).first()
        
        # Extract primary email
        primary_email_id = data.get("primary_email_address_id")
        email_addresses = data.get("email_addresses", [])
        primary_email = next((email.get("email_address") for email in email_addresses 
                           if email.get("id") == primary_email_id), None)
        
        if not user and primary_email:
            # Check if this is the admin email
            is_admin = primary_email == ADMIN_EMAIL
            
            # Create new user
            user = User(
                clerk_id=clerk_user_id,
                username=data.get("username") or f"user_{clerk_user_id}",
                email=primary_email,
                phone=data.get("phone_numbers", [{}])[0].get("phone_number", "") if data.get("phone_numbers") else "",
                is_admin=is_admin
            )
            db.add(user)
            logger.info(f"Created new user from webhook: {primary_email}, admin: {is_admin}")
        elif user and primary_email:
            # Update existing user
            user.username = data.get("username") or user.username
            user.email = primary_email
            
            # Check if this is the admin email
            if primary_email == ADMIN_EMAIL and not user.is_admin:
                user.is_admin = True
                logger.info(f"Updated user to admin status: {primary_email}")
                
            if data.get("phone_numbers"):
                user.phone = data.get("phone_numbers", [{}])[0].get("phone_number", "") or user.phone
        
        db.commit()
        
        return {"status": "success", "message": "User data synced"}
    
    elif event_type == "user.deleted":
        data = payload.get("data", {})
        clerk_user_id = data.get("id")
        
        if not clerk_user_id:
            return {"status": "error", "message": "Invalid webhook payload"}
        
        # Find and mark user as deleted or handle as needed
        user = db.query(User).filter(User.clerk_id == clerk_user_id).first()
        if user:
            user.is_banned = True  # Or implement your own deletion policy
            db.commit()
        
        return {"status": "success", "message": "User deletion handled"}
    
    return {"status": "success", "message": "Webhook received"}

@app.get("/user/events/created", response_model=List[EventResponse])
async def get_user_created_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = db.query(Event).filter(Event.organizer_id == current_user.id).all()
    return events

@app.get("/user/events/signedup", response_model=List[EventResponse])
async def get_user_signedup_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    registrations = db.query(EventRegistration).filter(EventRegistration.user_id == current_user.id).all()
    events = [registration.event for registration in registrations]
    return events

@app.get("/events/{event_id}/details", response_model=EventResponse)
async def get_event_details(
    event_id: int,
    current_user: User = Depends(get_current_user_or_none),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Create a view tracking table if it doesn't exist
    if not inspect(engine).has_table("event_views"):
        Base.metadata.create_all(bind=engine)
    
    # Only track views and update counts for authenticated users
    if current_user:
        # Check if user has already viewed this event in the last 24 hours
        last_24h = datetime.utcnow() - timedelta(hours=24)
        existing_view = db.query(EventView).filter(
            EventView.event_id == event_id,
            EventView.user_id == current_user.id,
            EventView.viewed_at >= last_24h
        ).first()
        
        if not existing_view:
            # Create new view record
            new_view = EventView(
                event_id=event_id,
                user_id=current_user.id,
                viewed_at=datetime.utcnow()
            )
            db.add(new_view)
            
            # Increment view count
            event.views += 1
            db.commit()
    
    # Get registration and like status only for authenticated users
    is_registered = False
    is_liked = False
    if current_user:
        registration = db.query(EventRegistration).filter(
            EventRegistration.event_id == event_id,
            EventRegistration.user_id == current_user.id
        ).first()
        is_registered = registration is not None

        like = db.query(EventLike).filter(
            EventLike.event_id == event_id,
            EventLike.user_id == current_user.id
        ).first()
        is_liked = like is not None
    
    # Count total likes
    likes_count = db.query(EventLike).filter(
        EventLike.event_id == event_id
    ).count()
    
    # Create response dictionary with all required fields
    response_dict = {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "location": event.location,
        "latitude": event.latitude,
        "longitude": event.longitude,
        "category": event.category,
        "type": event.type,
        "price": event.price,
        "views": event.views,
        "start_date": event.start_date,
        "end_date": event.end_date,
        "registration_start": event.registration_start,
        "registration_end": event.registration_end,
        "image_path": event.image_path,
        "organizer_id": event.organizer_id,
        "is_approved": event.is_approved,
        "created_at": event.created_at,
        "updated_at": event.updated_at,
        "attendees_count": event.attendees_count,
        "is_registered": is_registered,
        "is_liked": is_liked,
        "likes_count": likes_count,
        "organizer": event.organizer
    }
    
    return response_dict

@app.post("/events/{event_id}/like")
async def like_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    existing_like = db.query(EventLike).filter(
        EventLike.event_id == event_id,
        EventLike.user_id == current_user.id
    ).first()
    
    if existing_like:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event already liked"
        )
    
    like = EventLike(event_id=event_id, user_id=current_user.id)
    db.add(like)
    db.commit()
    
    return {"message": "Event liked successfully"}

@app.delete("/events/{event_id}/like")
async def unlike_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    like = db.query(EventLike).filter(
        EventLike.event_id == event_id,
        EventLike.user_id == current_user.id
    ).first()
    
    if not like:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Like not found"
        )
    
    db.delete(like)
    db.commit()
    
    return {"message": "Event unliked successfully"}

@app.post("/events/{event_id}/report")
async def report_event(
    event_id: int,
    report: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    # Check if user has already reported this event
    existing_report = db.query(EventReport).filter(
        EventReport.event_id == event_id,
        EventReport.user_id == current_user.id
    ).first()
    
    if existing_report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reported this event"
        )
    
    report = EventReport(
        event_id=event_id,
        user_id=current_user.id,
        reason=report.get("reason")
    )
    db.add(report)
    db.commit()
    
    return {"message": "Event reported successfully"}

@app.get("/user/events/organizing", response_model=List[EventResponse])
async def get_user_organized_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all events organized by the current user"""
    events = db.query(Event).filter(
        Event.organizer_id == current_user.id
    ).order_by(Event.start_date.desc()).all()
    
    return events

@app.get("/events/{event_id}/dashboard")
async def get_event_dashboard(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if user is authorized (admin or event organizer)
    if not current_user.is_admin and event.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view dashboard")
    
    # Get event statistics
    likes_count = db.query(EventLike).filter(EventLike.event_id == event_id).count()
    
    # Get registrations with detailed information
    registrations = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.status == "registered"
    ).all()
    
    # Get interested users count
    interested_count = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.status == "interested"
    ).count()
    
    # Process registration data
    total_registrations = len(registrations)
    all_attendees = []
    total_age = 0
    age_count = 0
    
    for registration in registrations:
        attendees = json.loads(registration.attendees)
        for attendee in attendees:
            all_attendees.append({
                "name": attendee.get("name", ""),
                "age": attendee.get("age", ""),
                "phone": attendee.get("phone", "")
            })
            # Calculate average age if age is provided
            try:
                age = int(attendee.get("age", ""))
                total_age += age
                age_count += 1
            except (ValueError, TypeError):
                continue
    
    # Calculate average age
    avg_age = round(total_age / age_count, 1) if age_count > 0 else None
    
    # Get registration trend (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily_registrations = db.query(
        func.date(EventRegistration.registered_at).label('date'),
        func.count().label('count')
    ).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.registered_at >= seven_days_ago
    ).group_by(
        func.date(EventRegistration.registered_at)
    ).all()
    
    # Get age distribution
    age_groups = {
        "0-18": 0,
        "19-25": 0,
        "26-35": 0,
        "36-50": 0,
        "50+": 0
    }
    
    for attendee in all_attendees:
        try:
            age = int(attendee.get("age", ""))
            if age <= 18:
                age_groups["0-18"] += 1
            elif age <= 25:
                age_groups["19-25"] += 1
            elif age <= 35:
                age_groups["26-35"] += 1
            elif age <= 50:
                age_groups["36-50"] += 1
            else:
                age_groups["50+"] += 1
        except (ValueError, TypeError):
            continue
    
    return {
        "event_id": event_id,
        "title": event.title,
        "views": event.views,
        "likes": likes_count,
        "registrations": {
            "total": total_registrations,
            "total_attendees": len(all_attendees),
            "average_age": avg_age,
            "age_distribution": age_groups,
            "attendees": all_attendees
        },
        "interested": interested_count,
        "daily_registrations": [
            {"date": str(day.date), "count": day.count}
            for day in daily_registrations
        ],
        "created_at": event.created_at,
        "last_updated": event.updated_at
    }

from math import radians, sin, cos, sqrt, atan2

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the distance between two points using the Haversine formula.
    Returns distance in kilometers.
    """
    R = 6371  # Earth's radius in kilometers

    # Convert latitude and longitude from strings to float
    lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
    
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    distance = R * c
    
    return round(distance, 2)

def get_coordinates_from_location(location: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Get latitude and longitude from a location string using Google Maps Geocoding API.
    Returns a tuple of (latitude, longitude) or (None, None) if geocoding fails.
    """
    try:
        # Geocode the location
        geocode_result = gmaps.geocode(location)
        
        if geocode_result and len(geocode_result) > 0:
            location_data = geocode_result[0]['geometry']['location']
            latitude = location_data['lat']
            longitude = location_data['lng']
            logger.info(f"Successfully geocoded location: {location} -> ({latitude}, {longitude})")
            return latitude, longitude
        else:
            logger.warning(f"No geocoding results found for location: {location}")
            return None, None
            
    except Exception as e:
        logger.error(f"Error geocoding location {location}: {str(e)}")
        return None, None

# Pydantic Models
class IssueCreate(BaseModel):
    title: str
    description: str
    location: str
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    category: str

class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None

class IssueResponse(BaseModel):
    id: int
    title: str
    description: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: str
    status: str
    image_path: Optional[str] = None
    reporter_id: int
    is_approved: bool
    created_at: datetime
    updated_at: datetime
    votes_count: int
    has_voted: Optional[bool] = None
    reporter: UserResponse
    
    class Config:
        from_attributes = True

# Issue endpoints
@app.post("/issues", response_model=IssueResponse)
async def create_issue(
    title: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    category: str = Form(...),
    image: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get coordinates from location if not provided
    if latitude is None or longitude is None:
        lat, lng = get_coordinates_from_location(location)
        if lat and lng:
            latitude = lat
            longitude = lng
    
    # Create issue
    db_issue = Issue(
        title=title,
        description=description,
        location=location,
        latitude=latitude,
        longitude=longitude,
        category=category,
        reporter_id=current_user.id,
        is_approved=current_user.is_verified_organizer,
        votes_count=0
    )
    
    # Handle image upload if provided
    if image:
        file_extension = image.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{file_extension}"
        file_location = f"uploads/{filename}"
        
        with open(file_location, "wb") as file_object:
            shutil.copyfileobj(image.file, file_object)
        
        db_issue.image_path = file_location
    
    db.add(db_issue)
    db.commit()
    db.refresh(db_issue)
    
    return db_issue

@app.get("/issues", response_model=List[IssueResponse])
def get_issues(
    category: Optional[str] = None,
    status: Optional[str] = None,
    approved_only: bool = True,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_none)
):
    query = db.query(Issue)
    
    if approved_only:
        query = query.filter(Issue.is_approved == True)
    
    if category:
        query = query.filter(Issue.category == category)
    
    if status:
        query = query.filter(Issue.status == status)
    
    issues = query.order_by(Issue.created_at.desc()).all()
    
    # Add vote status for authenticated users
    if current_user:
        for issue in issues:
            vote = db.query(IssueVote).filter(
                IssueVote.issue_id == issue.id,
                IssueVote.user_id == current_user.id
            ).first()
            issue.has_voted = vote is not None
    
    return issues

@app.get("/issues/{issue_id}", response_model=IssueResponse)
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_or_none)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    if current_user:
        vote = db.query(IssueVote).filter(
            IssueVote.issue_id == issue_id,
            IssueVote.user_id == current_user.id
        ).first()
        issue.has_voted = vote is not None
    
    return issue

@app.post("/issues/{issue_id}/vote")
async def vote_issue(
    issue_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    existing_vote = db.query(IssueVote).filter(
        IssueVote.issue_id == issue_id,
        IssueVote.user_id == current_user.id
    ).first()
    
    if existing_vote:
        raise HTTPException(status_code=400, detail="Already voted for this issue")
    
    vote = IssueVote(issue_id=issue_id, user_id=current_user.id)
    db.add(vote)
    issue.votes_count += 1
    db.commit()
    
    return {"message": "Vote recorded successfully"}

@app.delete("/issues/{issue_id}/vote")
async def remove_vote(
    issue_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vote = db.query(IssueVote).filter(
        IssueVote.issue_id == issue_id,
        IssueVote.user_id == current_user.id
    ).first()
    
    if not vote:
        raise HTTPException(status_code=404, detail="Vote not found")
    
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    issue.votes_count = max(0, issue.votes_count - 1)
    
    db.delete(vote)
    db.commit()
    
    return {"message": "Vote removed successfully"}

@app.put("/admin/issues/{issue_id}/approve")
async def approve_issue(
    issue_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    issue.is_approved = True
    db.commit()
    
    return {"message": "Issue approved successfully"}

@app.put("/admin/issues/{issue_id}/resolve")
async def resolve_issue(
    issue_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    issue.status = "resolved"
    db.commit()
    
    return {"message": "Issue marked as resolved"}

@app.get("/admin/issues/pending", response_model=List[IssueResponse])
async def get_pending_issues(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    issues = db.query(Issue).filter(Issue.is_approved == False).all()
    logger.info(f"Found {len(issues)} pending issues for admin {admin_user.email}")
    return issues

@app.delete("/admin/issues/{issue_id}/reject")
async def reject_issue(
    issue_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    db.delete(issue)
    db.commit()
    
    logger.info(f"Admin {admin_user.email} rejected issue {issue_id}")
    return {"message": "Issue rejected and deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)