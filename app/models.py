"""
Civic Lens — Database Models
SQLAlchemy models replacing Firestore collections.
"""

import uuid
import time
from datetime import datetime, timezone
from flask_login import UserMixin
from app import db, login_manager


def generate_uuid():
    return str(uuid.uuid4()).replace('-', '')


class User(UserMixin, db.Model):
    """User profile model — replaces Firestore /users/{userId}"""
    __tablename__ = 'users'

    id = db.Column(db.String(128), primary_key=True, default=generate_uuid)
    email = db.Column(db.String(255), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)  # None for OAuth users
    display_name = db.Column(db.String(255), default='Citizen')
    phone_number = db.Column(db.String(20), default='')
    role = db.Column(db.String(20), default='citizen')  # citizen | official | admin
    photo_url = db.Column(db.String(500), nullable=True)
    provider = db.Column(db.String(50), default='email')  # email | google | anonymous
    is_anonymous = db.Column(db.Boolean, default=False)
    email_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    feedbacks = db.relationship('Feedback', backref='author', lazy='dynamic', foreign_keys='Feedback.author_id')
    votes = db.relationship('Vote', backref='voter', lazy='dynamic')
    comments = db.relationship('Comment', backref='commenter', lazy='dynamic')
    poll_responses = db.relationship('PollResponse', backref='respondent', lazy='dynamic')

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_official(self):
        return self.role in ('official', 'admin')

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'display_name': self.display_name,
            'phone_number': self.phone_number,
            'role': self.role,
            'photo_url': self.photo_url,
            'provider': self.provider,
            'is_anonymous': self.is_anonymous,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, user_id)


class Budget(db.Model):
    """Budget item model — replaces Firestore /budgets/{budgetId}"""
    __tablename__ = 'budgets'

    id = db.Column(db.String(128), primary_key=True, default=generate_uuid)
    department = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(255), nullable=False)
    sub_category = db.Column(db.String(255), nullable=True)
    line_item = db.Column(db.String(500), default='')
    amount = db.Column(db.Float, nullable=False)
    fiscal_year = db.Column(db.String(20), nullable=False)
    transaction_type = db.Column(db.String(20), default='Expenditure')  # Revenue | Expenditure
    description = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'department': self.department,
            'category': self.category,
            'sub_category': self.sub_category,
            'line_item': self.line_item,
            'amount': self.amount,
            'fiscal_year': self.fiscal_year,
            'transaction_type': self.transaction_type,
            'description': self.description,
        }


class Feedback(db.Model):
    """Citizen feedback model — replaces Firestore /feedback/{feedbackId}"""
    __tablename__ = 'feedback'

    id = db.Column(db.String(128), primary_key=True, default=generate_uuid)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(255), nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    author_id = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='active')  # active | flagged | moderated
    moderation_status = db.Column(db.String(20), nullable=True)  # pending | approved | rejected
    moderated_by = db.Column(db.String(128), nullable=True)
    moderated_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    votes = db.relationship('Vote', backref='feedback', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='feedback', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'department': self.department,
            'image_url': self.image_url,
            'author_id': self.author_id,
            'upvotes': self.upvotes,
            'downvotes': self.downvotes,
            'status': self.status,
            'moderation_status': self.moderation_status,
            'moderated_by': self.moderated_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Vote(db.Model):
    """Vote on feedback — replaces Firestore /feedback/{id}/votes/{voteId}"""
    __tablename__ = 'votes'

    id = db.Column(db.String(128), primary_key=True, default=generate_uuid)
    feedback_id = db.Column(db.String(128), db.ForeignKey('feedback.id'), nullable=False)
    user_id = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    vote_type = db.Column(db.String(10), nullable=False)  # upvote | downvote
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (db.UniqueConstraint('feedback_id', 'user_id', name='unique_vote'),)


class Comment(db.Model):
    """Comment on feedback — replaces Firestore /feedback/{id}/comments/{commentId}"""
    __tablename__ = 'comments'

    id = db.Column(db.String(128), primary_key=True, default=generate_uuid)
    text = db.Column(db.Text, nullable=False)
    feedback_id = db.Column(db.String(128), db.ForeignKey('feedback.id'), nullable=False)
    author_id = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'feedback_id': self.feedback_id,
            'author_id': self.author_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Poll(db.Model):
    """Priority poll — replaces Firestore /polls/{pollId}"""
    __tablename__ = 'polls'

    id = db.Column(db.String(128), primary_key=True, default=generate_uuid)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default='')
    is_active = db.Column(db.Boolean, default=True)
    closes_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    responses = db.relationship('PollResponse', backref='poll', lazy='dynamic', cascade='all, delete-orphan')
    options = db.relationship('PriorityOption', backref='poll', lazy='dynamic', cascade='all, delete-orphan')


class PriorityOption(db.Model):
    """Priority options — replaces Firestore /priorityOptions/{optionId}"""
    __tablename__ = 'priority_options'

    id = db.Column(db.String(128), primary_key=True, default=generate_uuid)
    poll_id = db.Column(db.String(128), db.ForeignKey('polls.id'), nullable=False)
    label = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default='')
    category = db.Column(db.String(100), default='General')
    sort_order = db.Column(db.Integer, default=0)


class PollResponse(db.Model):
    """Poll response — replaces Firestore /polls/{id}/responses/{responseId}"""
    __tablename__ = 'poll_responses'

    id = db.Column(db.String(128), primary_key=True, default=generate_uuid)
    poll_id = db.Column(db.String(128), db.ForeignKey('polls.id'), nullable=False)
    user_id = db.Column(db.String(128), db.ForeignKey('users.id'), nullable=False)
    ranking = db.Column(db.Text, nullable=False)  # JSON string of ordered IDs
    submitted_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (db.UniqueConstraint('poll_id', 'user_id', name='unique_poll_response'),)
