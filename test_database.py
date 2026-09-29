from backend.database import test_database_connection


try:
    result = test_database_connection()

    print("================================")
    print("PostgreSQL connection successful")
    print("Database test result:", result)
    print("================================")

except Exception as error:
    print("================================")
    print("PostgreSQL connection failed")
    print("Error:", error)
    print("================================")