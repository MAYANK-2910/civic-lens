"""Civic Lens — Database Seeder: populates budget + poll data."""
import json, random, math
from app import create_app, db
from app.models import Budget, Poll, PriorityOption

REVENUE_CATS = [
    'Property Tax', 'State Govt. Grants', 'CFC Grants (Central)',
    'Water & Sewerage Charges', 'Professional Tax', 'Fines & Penalties', 'Other Local Taxes'
]
EXPENSE_CATS = [
    'Public Works (Roads & Bridges)', 'Health & Solid Waste Management',
    'Water Supply Operations', 'Administrative & Salaries',
    'Education (Municipal Schools)', 'Parks & Urban Forestry', 'Social Welfare'
]
YEARS = [f'{y}-{y+1}' for y in range(2015, 2025)]

def seed():
    app = create_app()
    with app.app_context():
        if Budget.query.first():
            print("Budget data already exists — skipping seed.")
        else:
            base_rev, base_exp = 1500, 1450
            tx_id = 1000
            for year in YEARS:
                g_rev = 1 + random.random() * 0.15
                g_exp = 1 + random.random() * 0.18
                act_rev = base_rev * 0.85 if year == '2020-2021' else base_rev * g_rev
                act_exp = base_exp * 1.3 if year == '2020-2021' else base_exp * g_exp
                for cat in REVENUE_CATS:
                    share = {'Property Tax': 0.35, 'State Govt. Grants': 0.25, 'CFC Grants (Central)': 0.20}.get(cat, 0.1)
                    amt = round(act_rev * share * (1 + random.random() * 0.1 - 0.05))
                    db.session.add(Budget(
                        id=f'TX-{tx_id}', department=cat, category=cat,
                        amount=amt, fiscal_year=year, transaction_type='Revenue',
                        description=f'Annual collection/receipt for {cat} in FY {year}'
                    ))
                    tx_id += 1
                for cat in EXPENSE_CATS:
                    share = 0.1
                    if cat == 'Public Works (Roads & Bridges)': share = 0.30
                    elif cat == 'Health & Solid Waste Management': share = 0.40 if year == '2020-2021' else 0.25
                    elif cat == 'Administrative & Salaries': share = 0.20
                    elif cat == 'Water Supply Operations': share = 0.15
                    amt = round(act_exp * share * (1 + random.random() * 0.1 - 0.05))
                    db.session.add(Budget(
                        id=f'TX-{tx_id}', department=cat, category=cat,
                        amount=amt, fiscal_year=year, transaction_type='Expenditure',
                        description=f'Allocated funds for {cat} in FY {year}'
                    ))
                    tx_id += 1
                base_rev, base_exp = act_rev, act_exp
            db.session.commit()
            print(f"Seeded {tx_id - 1000} budget records.")

        if not Poll.query.first():
            poll = Poll(id='annual_2024', title='Annual Priority Poll 2024-25',
                        description='Rank your top civic priorities', is_active=True)
            db.session.add(poll)
            items = [
                ('1', 'Public Transit Expansion', 'Increase bus routes and subway frequency.', 'Transport'),
                ('2', 'Affordable Housing', 'Subsidies and new residential zoning.', 'Community'),
                ('3', 'Green Energy Initiative', 'Transition municipal buildings to solar.', 'Environment'),
                ('4', 'Tech Education in Schools', 'Coding and AI literacy programs.', 'Education'),
                ('5', 'Urban Park Maintenance', 'Revitalize existing city park spaces.', 'Environment'),
                ('6', 'Police System Reform', 'Community-led safety programs.', 'Safety'),
            ]
            for i, (oid, label, desc, cat) in enumerate(items):
                db.session.add(PriorityOption(id=oid, poll_id='annual_2024', label=label, description=desc, category=cat, sort_order=i))
            db.session.commit()
            print("Seeded poll data.")

        print("Seeding complete!")

if __name__ == '__main__':
    seed()
