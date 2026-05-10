"""
Civic Lens — API Blueprint
JSON endpoints for AJAX calls from the frontend.
"""

import json
import csv
import io
import os
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app import db, limiter
from app.models import (
    User, Budget, Feedback, Vote, Comment,
    Poll, PriorityOption, PollResponse
)
from app.auth import jwt_required, admin_required

api_bp = Blueprint('api', __name__)


# ─── Budget API ──────────────────────────────────────────────────────────────

@api_bp.route('/budgets', methods=['GET'])
@login_required
def get_budgets():
    fiscal_year = request.args.get('fiscal_year')
    q = Budget.query
    if fiscal_year and fiscal_year != 'All':
        q = q.filter_by(fiscal_year=fiscal_year)
    budgets = q.order_by(Budget.fiscal_year.desc()).all()
    return jsonify([b.to_dict() for b in budgets])


@api_bp.route('/budgets/years', methods=['GET'])
@login_required
def get_budget_years():
    years = db.session.query(Budget.fiscal_year).distinct().order_by(Budget.fiscal_year.desc()).all()
    return jsonify([y[0] for y in years])


@api_bp.route('/budgets/summary', methods=['GET'])
@login_required
def get_budget_summary():
    fiscal_year = request.args.get('fiscal_year', '2024-2025')
    budgets = Budget.query.filter_by(fiscal_year=fiscal_year).all()
    total_rev = sum(b.amount for b in budgets if b.transaction_type == 'Revenue')
    total_exp = sum(b.amount for b in budgets if b.transaction_type == 'Expenditure')
    return jsonify({
        'total_revenue': total_rev,
        'total_expenditure': total_exp,
        'net': total_rev - total_exp,
        'fiscal_year': fiscal_year,
    })


@api_bp.route('/budgets/upload', methods=['POST'])
@login_required
def upload_budget_csv():
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file provided'}), 400
    try:
        stream = io.StringIO(file.stream.read().decode('utf-8'))
        reader = csv.DictReader(stream)
        count = 0
        for row in reader:
            b = Budget(
                department=row.get('department', row.get('Department', '')),
                category=row.get('category', row.get('Category', '')),
                line_item=row.get('line_item', row.get('Line Item', '')),
                amount=float(row.get('amount', row.get('Amount', 0))),
                fiscal_year=row.get('fiscal_year', row.get('Fiscal Year', '')),
                transaction_type=row.get('type', row.get('Type', 'Expenditure')),
                description=row.get('description', row.get('Description', '')),
            )
            db.session.add(b)
            count += 1
        db.session.commit()
        return jsonify({'message': f'Uploaded {count} records', 'count': count})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@api_bp.route('/budgets/export', methods=['GET'])
@login_required
def export_budget_csv():
    fiscal_year = request.args.get('fiscal_year', 'All')
    q = Budget.query
    if fiscal_year != 'All':
        q = q.filter_by(fiscal_year=fiscal_year)
    budgets = q.all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Fiscal Year', 'Type', 'Category', 'Description', 'Amount'])
    for b in budgets:
        writer.writerow([b.id, b.fiscal_year, b.transaction_type, b.category, b.description, b.amount])
    from flask import Response
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment;filename=budget_{fiscal_year}.csv'}
    )


# ─── AI Insights ─────────────────────────────────────────────────────────────

@api_bp.route('/budgets/ai-insight', methods=['POST'])
@login_required
@limiter.limit("5 per minute")
def generate_ai_insight():
    api_key = current_app.config.get('GEMINI_API_KEY')
    if not api_key:
        return jsonify({'insight': 'AI insights unavailable. Please configure your Gemini API key.'}), 200
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        data = request.get_json() or {}
        fiscal_year = data.get('fiscal_year', '2024-2025')
        total_rev = data.get('total_revenue', 0)
        total_exp = data.get('total_expenditure', 0)
        net = data.get('net', 0)
        top_rev = data.get('top_revenues', '')
        top_exp = data.get('top_expenditures', '')

        prompt = f"""Act as an expert financial auditor for an Indian Municipal Corporation.
Analyze this fiscal year summary for {fiscal_year}:
Total Revenue: ₹{total_rev} Crore. Total Expenditure: ₹{total_exp} Crore. Net: ₹{net} Crore.
Top Revenues: {top_rev}. Top Expenditures: {top_exp}.
Write a 3-sentence analytical summary for public transparency."""

        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        return jsonify({'insight': response.text})
    except Exception as e:
        return jsonify({'insight': f'Unable to generate insight: {str(e)}'}), 200


# ─── Feedback API ────────────────────────────────────────────────────────────

@api_bp.route('/feedback', methods=['GET'])
@login_required
def get_feedbacks():
    feedbacks = Feedback.query.filter(
        (Feedback.status == 'active') |
        (Feedback.moderation_status == 'approved') |
        (Feedback.author_id == current_user.id)
    ).order_by(Feedback.created_at.desc()).limit(50).all()
    return jsonify([f.to_dict() for f in feedbacks])


@api_bp.route('/feedback', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def create_feedback():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    fb = Feedback(
        title=data.get('title', ''),
        description=data.get('description', ''),
        category=data.get('category', 'General'),
        author_id=current_user.id,
    )
    db.session.add(fb)
    db.session.commit()
    return jsonify(fb.to_dict()), 201


@api_bp.route('/feedback/<feedback_id>/vote', methods=['POST'])
@login_required
@limiter.limit("30 per minute")
def vote_feedback(feedback_id):
    data = request.get_json()
    vote_type = data.get('type', 'upvote')
    fb = db.session.get(Feedback, feedback_id)
    if not fb:
        return jsonify({'error': 'Feedback not found'}), 404

    existing = Vote.query.filter_by(feedback_id=feedback_id, user_id=current_user.id).first()
    if existing:
        if existing.vote_type == vote_type:
            # Remove vote
            if vote_type == 'upvote':
                fb.upvotes = max(0, fb.upvotes - 1)
            else:
                fb.downvotes = max(0, fb.downvotes - 1)
            db.session.delete(existing)
        else:
            # Switch vote
            if vote_type == 'upvote':
                fb.upvotes += 1
                fb.downvotes = max(0, fb.downvotes - 1)
            else:
                fb.downvotes += 1
                fb.upvotes = max(0, fb.upvotes - 1)
            existing.vote_type = vote_type
            existing.updated_at = datetime.now(timezone.utc)
    else:
        vote = Vote(feedback_id=feedback_id, user_id=current_user.id, vote_type=vote_type)
        db.session.add(vote)
        if vote_type == 'upvote':
            fb.upvotes += 1
        else:
            fb.downvotes += 1

    db.session.commit()
    return jsonify({'upvotes': fb.upvotes, 'downvotes': fb.downvotes})


@api_bp.route('/feedback/<feedback_id>/comments', methods=['GET'])
@login_required
def get_comments(feedback_id):
    comments = Comment.query.filter_by(feedback_id=feedback_id).order_by(Comment.created_at.asc()).all()
    result = []
    for c in comments:
        d = c.to_dict()
        u = db.session.get(User, c.author_id)
        d['author_name'] = u.display_name if u else 'Citizen'
        d['is_self'] = c.author_id == current_user.id
        result.append(d)
    return jsonify(result)


@api_bp.route('/feedback/<feedback_id>/comments', methods=['POST'])
@login_required
@limiter.limit("20 per minute")
def create_comment(feedback_id):
    data = request.get_json()
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'Comment text required'}), 400
    comment = Comment(text=text, feedback_id=feedback_id, author_id=current_user.id)
    db.session.add(comment)
    db.session.commit()
    d = comment.to_dict()
    d['author_name'] = current_user.display_name
    d['is_self'] = True
    return jsonify(d), 201


@api_bp.route('/feedback/<feedback_id>/moderate', methods=['POST'])
@login_required
def moderate_feedback(feedback_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    data = request.get_json()
    fb = db.session.get(Feedback, feedback_id)
    if not fb:
        return jsonify({'error': 'Feedback not found'}), 404
    new_status = data.get('status', 'approved')
    fb.moderation_status = new_status
    fb.status = 'active' if new_status == 'approved' else 'moderated'
    fb.moderated_by = current_user.id
    fb.moderated_at = datetime.now(timezone.utc)
    if data.get('title'):
        fb.title = data['title']
    if data.get('description'):
        fb.description = data['description']
    if data.get('category'):
        fb.category = data['category']
    db.session.commit()
    return jsonify(fb.to_dict())


# ─── Poll API ────────────────────────────────────────────────────────────────

@api_bp.route('/polls/active', methods=['GET'])
@login_required
def get_active_poll():
    poll = Poll.query.filter_by(is_active=True).first()
    if not poll:
        return jsonify(None)
    options = PriorityOption.query.filter_by(poll_id=poll.id).order_by(PriorityOption.sort_order).all()
    existing = PollResponse.query.filter_by(poll_id=poll.id, user_id=current_user.id).first()
    return jsonify({
        'id': poll.id,
        'title': poll.title,
        'description': poll.description,
        'is_active': poll.is_active,
        'already_submitted': existing is not None,
        'total_responses': PollResponse.query.filter_by(poll_id=poll.id).count(),
        'options': [{'id': o.id, 'label': o.label, 'description': o.description, 'category': o.category} for o in options],
    })


@api_bp.route('/polls/<poll_id>/respond', methods=['POST'])
@login_required
@limiter.limit("5 per minute")
def submit_poll(poll_id):
    data = request.get_json()
    ranking = data.get('ranking', [])
    if not ranking:
        return jsonify({'error': 'Ranking required'}), 400
    existing = PollResponse.query.filter_by(poll_id=poll_id, user_id=current_user.id).first()
    if existing:
        existing.ranking = json.dumps(ranking)
        existing.submitted_at = datetime.now(timezone.utc)
    else:
        resp = PollResponse(
            poll_id=poll_id,
            user_id=current_user.id,
            ranking=json.dumps(ranking),
        )
        db.session.add(resp)
    db.session.commit()
    return jsonify({'success': True})


# ─── Admin: Users ────────────────────────────────────────────────────────────

@api_bp.route('/admin/users', methods=['GET'])
@login_required
def get_users():
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    users = User.query.filter(User.is_anonymous == False).order_by(User.created_at.desc()).limit(50).all()
    return jsonify([u.to_dict() for u in users])


@api_bp.route('/admin/feedback', methods=['GET'])
@login_required
def get_all_feedback():
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).limit(50).all()
    return jsonify([f.to_dict() for f in feedbacks])
