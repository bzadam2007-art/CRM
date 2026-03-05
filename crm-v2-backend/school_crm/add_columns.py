
import sqlite3
import os

DB_PATH = os.path.join('instance', 'school_crm.db')

def add_columns():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Add country_group
        try:
            cursor.execute("ALTER TABLE prospect ADD COLUMN country_group VARCHAR(20) DEFAULT 'other'")
            print("Added column: country_group")
        except sqlite3.OperationalError as e:
            print(f"Skipping country_group: {e}")

        # Add interaction_email_sent
        try:
            cursor.execute("ALTER TABLE prospect ADD COLUMN interaction_email_sent BOOLEAN DEFAULT 0")
            print("Added column: interaction_email_sent")
        except sqlite3.OperationalError as e:
            print(f"Skipping interaction_email_sent: {e}")

        # Add interaction_response_received
        try:
            cursor.execute("ALTER TABLE prospect ADD COLUMN interaction_response_received BOOLEAN DEFAULT 0")
            print("Added column: interaction_response_received")
        except sqlite3.OperationalError as e:
            print(f"Skipping interaction_response_received: {e}")

        conn.commit()
        print("Migration completed successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_columns()
