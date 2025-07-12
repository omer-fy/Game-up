# app.py

import os
import re
import requests
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from email_validator import validate_email, EmailNotValidError # Import the email validator
from functools import wraps
from sqlalchemy.exc import IntegrityError

# Load environment variables from .env file
load_dotenv()

# Initialize Flask App
app = Flask(__name__)
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

VERCEL_URL = "https://game-up-lime.vercel.app" 

CORS(app, origins=[VERCEL_URL, "http://localhost:3000"], supports_credentials=True)

# --- Configuration ---
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY') # Load secret key from .env
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL or 'sqlite:///gameup.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# --- Initialize Extensions ---
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# --- Database Models (MODIFIED) ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # username must be unique and cannot be null
    username = db.Column(db.String(80), unique=True, nullable=False) 
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'
    
# --- NEW: UserGame Model ---
class UserGame(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    igdb_game_id = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), nullable=False) # e.g., "Playing", "Completed", "Wishlist"

    __table_args__ = (db.UniqueConstraint('user_id', 'igdb_game_id', name='_user_game_uc'),)

    def __repr__(self):
        return f'<UserGame user:{self.user_id} game:{self.igdb_game_id} status:{self.status}>'
    
def token_required(f):
    """A decorator to protect routes that require a logged-in user."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            # The header should be in the format 'Bearer <token>'
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
        except:
            return jsonify({'message': 'Token is invalid!'}), 401

        # Pass the current_user object to the decorated function
        return f(current_user, *args, **kwargs)

    return decorated_function

# --- API Endpoints ---
@app.route("/register", methods=['POST'])
def register_user():
    data = request.get_json()
    username = data.get('username') # Get username
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required"}), 400
    
    # --- NEW: BACKEND VALIDATION ---

    # 1. Email Validation
    try:
        # The validate_email function checks for valid format and deliverability.
        valid = validate_email(email)
        # You can use the normalized form of the email address
        email = valid.email
    except EmailNotValidError as e:
        # The email is not valid, return a specific error message.
        return jsonify({"error": str(e)}), 400

    # 2. Password Strength Validation (example: 8+ chars, 1 uppercase, 1 lowercase, 1 digit)
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400
    if not re.search(r"[A-Z]", password):
        return jsonify({"error": "Password must contain at least one uppercase letter"}), 400
    if not re.search(r"[a-z]", password):
        return jsonify({"error": "Password must contain at least one lowercase letter"}), 400
    if not re.search(r"[0-9]", password):
        return jsonify({"error": "Password must contain at least one digit"}), 400

    # Check if username or email already exists
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "This username is already taken"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "This email is already registered"}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, email=email, password_hash=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": f"User '{username}' created successfully"}), 201

# --- NEW LOGIN ENDPOINT ---
@app.route("/login", methods=['POST'])
def login_user():
    data = request.get_json()
    # 'identifier' can be either username or email
    identifier = data.get('identifier') 
    password = data.get('password')

    if not identifier or not password:
        return jsonify({"error": "Identifier and password are required"}), 400

    # Find the user by either email or username
    user = User.query.filter((User.username == identifier) | (User.email == identifier)).first()

    # Check if user exists and password is correct
    if user and bcrypt.check_password_hash(user.password_hash, password):
        # Create a JWT token
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.now(timezone.utc) + timedelta(hours=24) # Token expires in 24 hours
        }, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({"message": "Login successful", "token": token}), 200
    
    return jsonify({"error": "Invalid credentials"}), 401 # 401 Unauthorized

# --- IGDB TOKEN MANAGEMENT ---
IGDB_CLIENT_ID = os.getenv('IGDB_CLIENT_ID')
IGDB_CLIENT_SECRET = os.getenv('IGDB_CLIENT_SECRET')
TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/token'
igdb_access_token = None
token_expires_at = datetime.now(timezone.utc)

def get_igdb_token():
    """Gets a new IGDB access token if the current one is expired."""
    global igdb_access_token, token_expires_at
    
    # If token exists and is not about to expire, return it
    if igdb_access_token and token_expires_at > datetime.now(timezone.utc) + timedelta(minutes=1):
        return igdb_access_token

    try:
        response = requests.post(
            TWITCH_AUTH_URL,
            params={
                'client_id': IGDB_CLIENT_ID,
                'client_secret': IGDB_CLIENT_SECRET,
                'grant_type': 'client_credentials'
            }
        )
        response.raise_for_status() # Raises an exception for bad responses (4xx or 5xx)
        data = response.json()
        
        igdb_access_token = data['access_token']
        # Set expiration time (with a small buffer)
        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=data['expires_in'] - 300)
        
        print("Successfully obtained new IGDB token.")
        return igdb_access_token
    except requests.exceptions.RequestException as e:
        print(f"Error getting IGDB token: {e}")
        return None

# --- NEW: SEARCH ENDPOINT ---
@app.route("/api/search", methods=['POST'])
def search_games():
    search_text = request.json.get('searchText')
    if not search_text:
        return jsonify({"error": "Search text is required"}), 400

    token = get_igdb_token()
    if not token:
        return jsonify({"error": "Could not authenticate with IGDB service"}), 500

    igdb_api_url = 'https://api.igdb.com/v4/games'
    
    # IGDB's query language is plain text. This query searches for the game title
    # and requests specific fields. We also get the cover art.
    # MODIFIED: Added a 'where' clause to filter by category.
    # 0 = main_game, 4 = standalone_expansion. This filters out DLC, expansions, etc.
    query_body = f'fields name, cover.url, first_release_date, summary; search "{search_text}"; where category = (0); limit 20;'

    headers = {
        'Client-ID': IGDB_CLIENT_ID,
        'Authorization': f'Bearer {token}'
    }

    try:
        response = requests.post(igdb_api_url, headers=headers, data=query_body)
        response.raise_for_status()
        
        # Format the data to be more frontend-friendly
        games = response.json()
        for game in games:
            if 'cover' in game and 'url' in game['cover']:
                # The returned URL is small. We can replace 't_thumb' with a larger image size.
                game['cover']['url'] = game['cover']['url'].replace('t_thumb', 't_cover_big')

        return jsonify(games), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to fetch data from IGDB: {e}"}), 502
    
# --- NEW: SINGLE GAME DETAIL ENDPOINT ---
@app.route("/api/game/<int:igdb_id>", methods=['GET'])
def get_game_details(igdb_id):
    token = get_igdb_token()
    if not token:
        return jsonify({"error": "Could not authenticate with IGDB service"}), 500
    
    igdb_api_url = 'https://api.igdb.com/v4/games'
    # A more detailed query for a single game page
    query_body = f'''
        fields 
            name, 
            cover.url, 
            first_release_date, 
            summary, 
            genres.name, 
            platforms.name,
            involved_companies.company.name,
            involved_companies.developer,
            involved_companies.publisher;
        where id = {igdb_id};
    '''
    
    headers = {
        'Client-ID': IGDB_CLIENT_ID,
        'Authorization': f'Bearer {token}'
    }

    try:
        response = requests.post(igdb_api_url, headers=headers, data=query_body)
        response.raise_for_status()
        game_data = response.json()

        if not game_data:
            return jsonify({"error": "Game not found"}), 404

        # Clean up the cover URL as before
        game = game_data[0]
         # Process the 'involved_companies' data
        developers = []
        publishers = []
        if 'involved_companies' in game:
            for entry in game['involved_companies']:
                company_name = entry.get('company', {}).get('name')
                if company_name:
                    if entry.get('developer'):
                        developers.append(company_name)
                    if entry.get('publisher'):
                        publishers.append(company_name)
        
        # Add the processed lists to our game object
        game['developers'] = list(set(developers)) # Use set to remove duplicates
        game['publishers'] = list(set(publishers)) # Use set to remove duplicates

        if 'cover' in game and 'url' in game['cover']:
            game['cover']['url'] = game['cover']['url'].replace('t_thumb', 't_cover_big')

        return jsonify(game), 200
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to fetch data from IGDB: {e}"}), 502
    
# --- NEW: Endpoint to check a single game's library status ---
@app.route("/api/library/status/<int:igdb_id>", methods=['GET'])
@token_required
def get_game_library_status(current_user, igdb_id):
    """Check if a single game is in the user's library and return its status."""
    user_game = UserGame.query.filter_by(
        user_id=current_user.id, 
        igdb_game_id=igdb_id
    ).first()

    if user_game:
        return jsonify({
            "inLibrary": True,
            "id": user_game.id, # The UserGame entry ID
            "status": user_game.status
        }), 200
    else:
        return jsonify({"inLibrary": False}), 200

# MODIFIED: Library management for GET, POST, PUT, DELETE
@app.route("/api/library", methods=['GET', 'POST'])
@app.route("/api/library/<int:user_game_id>", methods=['PUT', 'DELETE'])
@token_required
def library_manager(current_user, user_game_id=None):
    # POST: Add a new game to the library
    if request.method == 'POST':
        data = request.get_json()
        igdb_id = data.get('igdb_game_id')
        status = data.get('status')

        if not igdb_id or not status:
            return jsonify({"error": "Game ID and status are required"}), 400
        
        valid_statuses = ["Playing", "Completed", "Dropped", "Wishlist"]
        if status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {valid_statuses}"}), 400

        try:
            new_user_game = UserGame(user_id=current_user.id, igdb_game_id=igdb_id, status=status)
            db.session.add(new_user_game)
            db.session.commit()
            # Return the newly created game object
            return jsonify({
                "message": "Game added successfully",
                "game": {
                    "id": new_user_game.id,
                    "igdb_game_id": new_user_game.igdb_game_id,
                    "status": new_user_game.status
                }
            }), 201
        except IntegrityError:
            db.session.rollback()
            return jsonify({"error": "This game is already in your library"}), 409
        
    # GET: Fetch the user's entire game library
    if request.method == 'GET':
        user_games = UserGame.query.filter_by(user_id=current_user.id).all()
        if not user_games:
            return jsonify([]), 200 # Return an empty list if library is empty

        game_ids = [game.igdb_game_id for game in user_games]
        
        # Now, fetch game details from IGDB for these IDs
        token = get_igdb_token()
        if not token:
            return jsonify({"error": "Could not authenticate with IGDB service"}), 500

        igdb_api_url = 'https://api.igdb.com/v4/games'
        # IGDB allows querying for multiple IDs like this: where id = (id1, id2, id3);
        query_body = f'fields name, cover.url, first_release_date; where id = ({",".join(map(str, game_ids))}); limit {len(game_ids)};'
        
        headers = {'Client-ID': IGDB_CLIENT_ID, 'Authorization': f'Bearer {token}'}

        try:
            response = requests.post(igdb_api_url, headers=headers, data=query_body)
            response.raise_for_status()
            igdb_games_data = response.json()

            # Create a dictionary for easy lookup: {igdb_id: game_data}
            igdb_games_map = {game['id']: game for game in igdb_games_data}

            # Combine our data with IGDB's data
            library = []
            for user_game in user_games:
                game_details = igdb_games_map.get(user_game.igdb_game_id)
                if game_details:
                    # Clean up cover URL
                    if 'cover' in game_details and 'url' in game_details['cover']:
                        game_details['cover']['url'] = game_details['cover']['url'].replace('t_thumb', 't_cover_big')
                    
                    library.append({
                        'id': user_game.id, # Our library entry ID
                        'igdb_game_id': user_game.igdb_game_id,
                        'status': user_game.status,
                        'details': game_details
                    })
            
            return jsonify(library), 200
        except requests.exceptions.RequestException as e:
            return jsonify({"error": f"Failed to fetch library data from IGDB: {e}"}), 502

    # Find the specific game entry in the user's library
    user_game = UserGame.query.filter_by(id=user_game_id, user_id=current_user.id).first()
    if not user_game:
        return jsonify({"error": "Game not found in your library"}), 404

    # PUT: Update the status of an existing game
    if request.method == 'PUT':
        data = request.get_json()
        new_status = data.get('status')
        
        valid_statuses = ["Playing", "Completed", "Dropped", "Wishlist"]
        if not new_status or new_status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {valid_statuses}"}), 400
            
        user_game.status = new_status
        db.session.commit()
        return jsonify({"message": "Game status updated successfully", "status": new_status}), 200

    # DELETE: Remove a game from the library
    if request.method == 'DELETE':
        db.session.delete(user_game)
        db.session.commit()
        return jsonify({"message": "Game removed from library successfully"}), 200

# --- NEW: Endpoint to get current user's info ---
@app.route("/api/me", methods=['GET'])
@token_required
def get_current_user(current_user):
    """Return the username of the currently logged-in user."""
    if current_user:
        return jsonify({"username": current_user.username}), 200
    return jsonify({"error": "User not found"}), 404


# --- Create Database Tables ---
@app.cli.command("init-db")
def init_db_command():
    """Drops existing tables and creates new ones."""
    db.drop_all() # Drop existing tables first
    db.create_all()
    print("Initialized the database.")