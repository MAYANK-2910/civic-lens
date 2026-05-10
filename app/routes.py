"""
Civic Lens — Main Routes Blueprint
"""

from flask import Blueprint, render_template
from flask_login import login_required, current_user
from app.auth import admin_required

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
@login_required
def dashboard():
    return render_template('dashboard.html', page='dashboard')


@main_bp.route('/budget')
@login_required
def budget():
    return render_template('budget.html', page='budget')


@main_bp.route('/feedback')
@login_required
def feedback():
    return render_template('feedback.html', page='feedback')


@main_bp.route('/poll')
@login_required
def poll():
    return render_template('poll.html', page='poll')


@main_bp.route('/profile')
@login_required
def profile():
    return render_template('profile.html', page='profile')


@main_bp.route('/admin')
@login_required
@admin_required
def admin():
    return render_template('admin.html', page='admin')


@main_bp.route('/health')
def health():
    return {'status': 'healthy', 'service': 'civic-lens'}, 200
