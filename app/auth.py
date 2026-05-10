"""
Civic Lens — Authentication Blueprint
Handles login, registration, Google OAuth, guest access, and JWT tokens.
"""

import os
import jwt
import uuid
import bcrypt
import requests
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import (
    Blueprint, render_template, request, redirect, url_for,
    flash, jsonify, session, current_app
)
from flask_login import login_user, logout_user, login_required, current_user
from app import db, limiter
from app.models import User

auth_bp = Blueprint('auth', __name__)


# ─── JWT Helper Functions ────────────────────────────────────────────────────

def generate_jwt(user):
    """Generate a JWT token for API authorization."""
    payload = {
        'sub': user.id,
        'email': user.email,
        'role': user.role,
        'display_name': user.display_name,
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')


def decode_jwt(token):
    """Decode and validate a JWT token."""
    try:
        return jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def jwt_required(f):
    """Decorator to require valid JWT for API endpoints."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Check Authorization header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        # Fallback to cookie
        if not token:
            token = request.cookies.get('jwt_token')

        if not token:
            return jsonify({'error': 'Authorization token required'}), 401

        payload = decode_jwt(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401

        # Attach user info to request
        request.jwt_payload = payload
        request.jwt_user_id = payload['sub']
        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    """Decorator to require admin role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            flash('Access denied. Admin privileges required.', 'error')
            return redirect(url_for('main.dashboard'))
        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    """Decorator to require specific roles."""
    def wrapper(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not current_user.is_authenticated or current_user.role not in roles:
                flash('Access denied. Insufficient privileges.', 'error')
                return redirect(url_for('main.dashboard'))
            return f(*args, **kwargs)
        return decorated
    return wrapper


# ─── Auth Routes ─────────────────────────────────────────────────────────────

@auth_bp.route('/auth', methods=['GET'])
def login():
    """Render the auth page (login / signup)."""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('auth/login.html')


@auth_bp.route('/auth/email-login', methods=['POST'])
@limiter.limit("10 per minute")
def email_login():
    """Handle email/password login."""
    email = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '')

    if not email or not password:
        flash('Email and password are required.', 'error')
        return redirect(url_for('auth.login'))

    user = User.query.filter_by(email=email).first()
    if not user or not user.password_hash:
        flash('Invalid email or password.', 'error')
        return redirect(url_for('auth.login'))

    if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        flash('Invalid email or password.', 'error')
        return redirect(url_for('auth.login'))

    login_user(user, remember=True)
    token = generate_jwt(user)

    response = redirect(url_for('main.dashboard'))
    response.set_cookie('jwt_token', token, httponly=True, samesite='Lax', max_age=86400)
    return response


@auth_bp.route('/auth/email-signup', methods=['POST'])
@limiter.limit("5 per minute")
def email_signup():
    """Handle email/password registration."""
    email = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '')

    if not email or not password:
        flash('Email and password are required.', 'error')
        return redirect(url_for('auth.login'))

    if len(password) < 6:
        flash('Password should be at least 6 characters.', 'error')
        return redirect(url_for('auth.login'))

    existing = User.query.filter_by(email=email).first()
    if existing:
        flash('An account with this email already exists.', 'error')
        return redirect(url_for('auth.login'))

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Check for admin email
    is_admin = email == 'connect4371@gmail.com'

    user = User(
        id=str(uuid.uuid4()).replace('-', ''),
        email=email,
        password_hash=hashed,
        display_name=email.split('@')[0].title(),
        role='admin' if is_admin else 'citizen',
        provider='email',
        email_verified=False,
    )
    db.session.add(user)
    db.session.commit()

    login_user(user, remember=True)
    token = generate_jwt(user)

    response = redirect(url_for('main.dashboard'))
    response.set_cookie('jwt_token', token, httponly=True, samesite='Lax', max_age=86400)
    return response


@auth_bp.route('/auth/google-callback', methods=['POST'])
@limiter.limit("10 per minute")
def google_callback():
    """Handle Google OAuth callback (server-side token verification)."""
    id_token = request.form.get('credential') or request.json.get('credential', '')

    if not id_token:
        flash('Google authentication failed.', 'error')
        return redirect(url_for('auth.login'))

    try:
        # Verify the Google ID token
        resp = requests.get(
            f'https://oauth2.googleapis.com/tokeninfo?id_token={id_token}',
            timeout=10
        )
        if resp.status_code != 200:
            flash('Google token verification failed.', 'error')
            return redirect(url_for('auth.login'))

        google_data = resp.json()
        email = google_data.get('email', '').lower()
        name = google_data.get('name', email.split('@')[0].title())
        picture = google_data.get('picture', '')

        # Find or create user
        user = User.query.filter_by(email=email).first()
        if not user:
            is_admin = email == 'connect4371@gmail.com'
            user = User(
                id=str(uuid.uuid4()).replace('-', ''),
                email=email,
                display_name=name,
                photo_url=picture,
                role='admin' if is_admin else 'citizen',
                provider='google',
                email_verified=True,
            )
            db.session.add(user)
        else:
            user.display_name = name
            user.photo_url = picture
            user.email_verified = True

        db.session.commit()
        login_user(user, remember=True)
        token = generate_jwt(user)

        response = redirect(url_for('main.dashboard'))
        response.set_cookie('jwt_token', token, httponly=True, samesite='Lax', max_age=86400)
        return response

    except Exception as e:
        current_app.logger.error(f'Google OAuth error: {e}')
        flash('Google authentication failed. Please try again.', 'error')
        return redirect(url_for('auth.login'))


@auth_bp.route('/auth/guest', methods=['POST'])
@limiter.limit("5 per minute")
def guest_login():
    """Create an anonymous guest session."""
    guest_id = str(uuid.uuid4()).replace('-', '')
    user = User(
        id=guest_id,
        email=None,
        display_name='Guest User',
        role='citizen',
        provider='anonymous',
        is_anonymous=True,
    )
    db.session.add(user)
    db.session.commit()

    login_user(user, remember=False)
    token = generate_jwt(user)

    response = redirect(url_for('main.dashboard'))
    response.set_cookie('jwt_token', token, httponly=True, samesite='Lax', max_age=86400)
    return response


@auth_bp.route('/auth/logout', methods=['GET', 'POST'])
@login_required
def logout():
    """Sign out the current user."""
    logout_user()
    response = redirect(url_for('auth.login'))
    response.delete_cookie('jwt_token')
    flash('You have been signed out.', 'info')
    return response


@auth_bp.route('/api/auth/token', methods=['POST'])
@login_required
def refresh_token():
    """Refresh the JWT token for the current user."""
    token = generate_jwt(current_user)
    return jsonify({'token': token})


@auth_bp.route('/api/auth/me', methods=['GET'])
@jwt_required
def me():
    """Get current user info via JWT."""
    user = db.session.get(User, request.jwt_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict())
