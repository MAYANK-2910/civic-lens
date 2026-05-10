"""Civic Lens — Entry Point"""
from app import create_app
app = create_app()

if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    app.run(debug=True, host='0.0.0.0', port=port)
