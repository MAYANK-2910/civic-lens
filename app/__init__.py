"""
Civic Lens — Flask Application Factory
A municipal transparency portal rewritten in Python.
"""

import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
login_manager = LoginManager()
csrf = CSRFProtect()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per minute"],
    storage_uri="memory://",
)


def create_app(config_name=None):
    """Create and configure the Flask application."""
    app = Flask(
        __name__,
        static_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'static'),
        template_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'templates'),
    )

    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'civic-lens-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///civic_lens.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', app.config['SECRET_KEY'])
    app.config['GEMINI_API_KEY'] = os.getenv('GEMINI_API_KEY', '')
    app.config['GOOGLE_CLIENT_ID'] = os.getenv('GOOGLE_CLIENT_ID', '')
    app.config['GOOGLE_CLIENT_SECRET'] = os.getenv('GOOGLE_CLIENT_SECRET', '')
    app.config['APP_URL'] = os.getenv('APP_URL', 'http://localhost:5000')
    app.config['WTF_CSRF_TIME_LIMIT'] = None  # No CSRF token expiry

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    limiter.init_app(app)

    login_manager.login_view = 'auth.login'
    login_manager.login_message_category = 'info'

    # Register blueprints
    from app.auth import auth_bp
    from app.routes import main_bp
    from app.api import api_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')

    # Exempt API from CSRF for AJAX calls (we use JWT instead)
    csrf.exempt(api_bp)

    # Create database tables
    with app.app_context():
        # Ensure database directory exists if using sqlite
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        if db_uri.startswith('sqlite:///'):
            db_path = db_uri.replace('sqlite:///', '')
            if db_path and os.path.dirname(db_path):
                os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
                
        from app import models  # noqa: F401
        db.create_all()

    # Context processor for templates
    @app.context_processor
    def inject_globals():
        return {
            'app_name': 'Civic Lens',
            'app_version': '2.0.0',
        }

    return app
