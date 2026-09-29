from backend.database import engine, Base
from backend.models import Report


print("Creating database tables...")

Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")