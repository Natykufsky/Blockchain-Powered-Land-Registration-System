"""
migrate_mongo_to_mysql.py
--------------------------
One-time migration script: exports data from MongoDB → MySQL.

Usage:
    python migrate_mongo_to_mysql.py

Prerequisites:
    pip install pymongo mysql-connector-python
    - MongoDB must be running
    - MySQL must be running with schema.sql already applied
"""

import json
import os
import pymongo
import mysql.connector
from bson import ObjectId
import gridfs

# ── Config ──────────────────────────────────────────────────────────────────
MONGO_URL   = "mongodb://localhost:27017"
MYSQL_HOST  = "localhost"
MYSQL_USER  = "root"
MYSQL_PASS  = ""          # ← change this

# ── Connect ──────────────────────────────────────────────────────────────────
mongo_client = pymongo.MongoClient(MONGO_URL)
land_registry_db = mongo_client.LandRegistry
revenue_dept_db  = mongo_client.Revenue_Dept
fs = gridfs.GridFS(land_registry_db)

mysql_conn = mysql.connector.connect(
    host=MYSQL_HOST, user=MYSQL_USER, password=MYSQL_PASS
)
cursor = mysql_conn.cursor()


# ── 1. Migrate Property_Docs (LandRegistry) ──────────────────────────────────
print("\n[1/2] Migrating LandRegistry.Property_Docs ...")
cursor.execute("USE LandRegistry")

migrated, skipped = 0, 0
for doc in land_registry_db.Property_Docs.find():
    prop_id  = doc.get("Property_Id", "")
    owner    = doc.get("Owner", "")
    survey   = doc.get("Survey_No", "")
    area     = doc.get("Area", "")
    filename = f"{owner}_{prop_id}.pdf"

    # Retrieve binary file from GridFS using the stored ObjectId key
    file_data = None
    try:
        grid_key = doc.get(filename)
        if grid_key:
            grid_out = fs.get(grid_key)
            file_data = grid_out.read()
    except Exception as e:
        print(f"  ⚠ Could not fetch file for {prop_id}: {e}")

    if file_data is None:
        file_data = b""   # insert empty blob if file missing

    try:
        cursor.execute(
            """
            INSERT IGNORE INTO property_docs
                (owner, property_id, survey_no, area, filename, file_data)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (owner, prop_id, survey, area, filename, file_data)
        )
        migrated += 1
    except mysql.connector.IntegrityError:
        skipped += 1

mysql_conn.commit()
print(f"  ✔ Done — {migrated} migrated, {skipped} skipped (duplicates)")


# ── 2. Migrate Employees (Revenue_Dept) ──────────────────────────────────────
print("\n[2/2] Migrating Revenue_Dept.Employees ...")
cursor.execute("USE Revenue_Dept")

migrated, skipped = 0, 0
for emp in revenue_dept_db.Employees.find():
    employee_id     = emp.get("employeeId")       # Ethereum address (employees)
    admin_address   = emp.get("adminAddress")     # Only present on admin record
    password_hash   = emp.get("password", "")
    fname           = emp.get("fname")
    lname           = emp.get("lname")
    revenue_dept_id = emp.get("revenueDeptId")

    try:
        cursor.execute(
            """
            INSERT IGNORE INTO employees
                (employee_id, admin_address, password_hash, fname, lname, revenue_dept_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (employee_id, admin_address, password_hash, fname, lname, revenue_dept_id)
        )
        migrated += 1
    except mysql.connector.IntegrityError:
        skipped += 1

mysql_conn.commit()
print(f"  ✔ Done — {migrated} migrated, {skipped} skipped (duplicates)")


# ── Cleanup ──────────────────────────────────────────────────────────────────
cursor.close()
mysql_conn.close()
mongo_client.close()
print("\n✅ Migration complete!")
