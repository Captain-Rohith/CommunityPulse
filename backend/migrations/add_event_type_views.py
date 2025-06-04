from sqlalchemy import create_engine, text

# Database connection
DATABASE_URL = "postgresql://postgres:rv@localhost:5432/CommunityPulse"
engine = create_engine(DATABASE_URL)

def upgrade():
    with engine.connect() as connection:
        # Add type column with default value 'Free'
        connection.execute(text("""
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS type VARCHAR(255) DEFAULT 'Free'
        """))
        
        # Add views column with default value 0
        connection.execute(text("""
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0
        """))
        
        connection.commit()

def downgrade():
    with engine.connect() as connection:
        # Remove the columns
        connection.execute(text("""
            ALTER TABLE events 
            DROP COLUMN IF EXISTS type,
            DROP COLUMN IF EXISTS views
        """))
        
        connection.commit()

if __name__ == "__main__":
    upgrade() 