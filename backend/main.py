# Firebase Functions Python Implementation (Skeleton)
# Note: In a real deployment, these would be in the 'functions' directory.

import firebase_admin
from firebase_admin import credentials, firestore
from firebase_functions import https_fn, options

# Initialize Firebase Admin SDK
firebase_admin.initialize_app()
db = firestore.client()

@https_fn.on_request()
def get_budget_summary(req: https_fn.Request) -> https_fn.Response:
    """API to fetch total budget summary."""
    try:
        fiscal_year = req.args.get('fiscalYear', '2023-2024')
        budgets_ref = db.collection('budgets').where('fiscalYear', '==', fiscal_year).stream()
        
        total_amount = 0
        department_breakdown = {}
        category_breakdown = {}
        
        for doc in budgets_ref:
            data = doc.to_dict()
            amt = data.get('amount', 0)
            dept = data.get('department', 'Other')
            cat = data.get('category', 'Other')
            
            total_amount += amt
            department_breakdown[dept] = department_breakdown.get(dept, 0) + amt
            category_breakdown[cat] = category_breakdown.get(cat, 0) + amt
            
        return https_fn.Response(
            json={
                "total": total_amount,
                "departments": department_breakdown,
                "categories": category_breakdown
            },
            status=200
        )
    except Exception as e:
        return https_fn.Response(str(e), status=500)

@https_fn.on_request()
def get_aggregated_feedback(req: https_fn.Request) -> https_fn.Response:
    """Official Dashboard: View aggregated feedback."""
    try:
        feedback_ref = db.collection('feedback').stream()
        
        aggregated = {}
        for doc in feedback_ref:
            data = doc.to_dict()
            cat = data.get('category', 'General')
            if cat not in aggregated:
                aggregated[cat] = {"count": 0, "upvotes": 0, "downvotes": 0}
            
            aggregated[cat]["count"] += 1
            aggregated[cat]["upvotes"] += data.get('upvotes', 0)
            aggregated[cat]["downvotes"] += data.get('downvotes', 0)
            
        return https_fn.Response(json=aggregated, status=200)
    except Exception as e:
        return https_fn.Response(str(e), status=500)

@https_fn.on_request()
def process_priority_poll(req: https_fn.Request) -> https_fn.Response:
    """Calculate aggregated results from polls."""
    try:
        polls_ref = db.collection('polls').stream()
        results = {}
        
        for doc in polls_ref:
            data = doc.to_dict()
            priorities = data.get('priorities', [])
            # Dynamic weighting: Rank 1 gets more points
            for i, p_id in enumerate(priorities):
                points = 5 - i
                results[p_id] = results.get(p_id, 0) + points
                
        return https_fn.Response(json=results, status=200)
    except Exception as e:
        return https_fn.Response(str(e), status=500)
