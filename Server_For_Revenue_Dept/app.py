from flask import Flask, jsonify, render_template, request, Response, redirect, session
import mysql.connector
from mysql.connector import pooling
from web3 import Web3, HTTPProvider
from werkzeug.security import generate_password_hash, check_password_hash
import os
import json
import mimetypes

from utility.mapRevenueDeptToEmployee import mapRevenueDeptIdToEmployee


# ── Config ────────────────────────────────────────────────────────────────────
basedir = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(basedir, "config.json"), "r") as f:
    config = json.load(f)

adminAddress  = config["Admin_Address"]
adminPassword = config["Admin_Password"]
NETWORK_CHAIN_ID = str(config["NETWORK_CHAIN_ID"])


# ── MySQL connection pool ─────────────────────────────────────────────────────
db_pool = pooling.MySQLConnectionPool(
    pool_name="revenue_pool",
    pool_size=5,
    host=config["MySQL_Host"],
    port=config.get("MySQL_Port", 3306),
    user=config["MySQL_User"],
    password=config["MySQL_Password"],
    database="Revenue_Dept"
)

def get_db():
    """Return a connection from the pool."""
    return db_pool.get_connection()


# ── Flask app ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = config["Secret_Key"]


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


@app.route("/login", methods=['POST'])
def login():
    employee_id = request.form['employeeId']
    password    = request.form['password']

    conn   = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM employees WHERE employee_id = %s", (employee_id,)
    )
    user = cursor.fetchone()
    cursor.close(); conn.close()

    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        return jsonify({
            'status': 1,
            'msg': 'Login Success',
            'revenueDepartmentId': user['revenue_dept_id'],
            'empName': user['fname']
        })
    return jsonify({'status': 0, 'msg': 'Invalid Wallet or password'})


@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect('/')


@app.route('/dashboard')
def dashboard():
    if 'user_id' in session:
        return render_template('dashboard.html')
    return redirect('/')


@app.route('/propertiesDocs/pdf/<propertyId>')
def get_pdf(propertyId):
    try:
        conn = mysql.connector.connect(
            host=config["MySQL_Host"],
            port=config.get("MySQL_Port", 3306),
            user=config["MySQL_User"],
            password=config["MySQL_Password"],
            database="LandRegistry"
        )
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT filename, mime_type, file_data FROM property_docs WHERE property_id = %s",
            (propertyId,)
        )
        row = cursor.fetchone()
        cursor.close(); conn.close()

        if not row:
            return jsonify({"status": 0, "Reason": "No Property Matched With Id"})

        content_type = row['mime_type'] or 'application/octet-stream'
        response = Response(row['file_data'], content_type=content_type)
        response.headers['Content-Disposition'] = f'inline; filename="{row["filename"]}"'
        return response

    except Exception as e:
        return jsonify({"status": 0, "Reason": str(e)})


@app.route('/propertiesDocs/meta/<propertyId>')
def get_doc_meta(propertyId):
    """Returns JSON with mime_type so frontend can render the right viewer."""
    try:
        conn = mysql.connector.connect(
            host=config["MySQL_Host"],
            port=config.get("MySQL_Port", 3306),
            user=config["MySQL_User"],
            password=config["MySQL_Password"],
            database="LandRegistry"
        )
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT mime_type, filename FROM property_docs WHERE property_id = %s",
            (propertyId,)
        )
        row = cursor.fetchone()
        cursor.close(); conn.close()
        if not row:
            return jsonify({"status": 0, "Reason": "Not found"}), 404
        return jsonify({"status": 1, "mime_type": row['mime_type'], "filename": row['filename']})
    except Exception as e:
        return jsonify({"status": 0, "Reason": str(e)}), 500


@app.route('/fetchContractDetails')
def fetchContractDetails():
    contracts_path = os.path.join(basedir, "..", "Smart_contracts", "build", "contracts")

    def load(name):
        with open(os.path.join(contracts_path, name)) as f:
            return json.load(f)

    users_contract    = load("Users.json")
    land_contract     = load("LandRegistry.json")
    transfer_contract = load("TransferOwnerShip.json")

    return {
        "Users": {
            "address": users_contract["networks"][NETWORK_CHAIN_ID]["address"],
            "abi":     users_contract["abi"]
        },
        "LandRegistry": {
            "address": land_contract["networks"][NETWORK_CHAIN_ID]["address"],
            "abi":     land_contract["abi"]
        },
        "TransferOwnership": {
            "address": transfer_contract["networks"][NETWORK_CHAIN_ID]["address"],
            "abi":     transfer_contract["abi"]
        }
    }


@app.route('/admin')
def adminIndexPage():
    return render_template('admin.html')


@app.route("/adminLogin", methods=['POST'])
def adminLogin():
    admin_address = request.form['adminAddress']
    password      = request.form['password']

    conn   = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM employees WHERE admin_address = %s", (admin_address,)
    )
    admin = cursor.fetchone()
    cursor.close(); conn.close()

    if admin and check_password_hash(admin['password_hash'], password):
        session['user_id'] = admin['id']
        return jsonify({'status': 1, 'msg': 'Admin Login Success'})
    return jsonify({'status': 0, 'msg': 'Invalid Wallet or password'})


@app.route("/addEmployee", methods=['POST'])
def addEmployee():
    if 'user_id' not in session:
        return jsonify({'status': 0, 'msg': 'Login Required'})

    employee_id     = request.form['empAddress']
    password        = request.form['password']
    fname           = request.form['fname']
    lname           = request.form['lname']
    revenue_dept_id = request.form['revenueDeptId']

    conn   = get_db()
    cursor = conn.cursor(dictionary=True)

    # Duplicate check
    cursor.execute(
        "SELECT id FROM employees WHERE employee_id = %s", (employee_id,)
    )
    if cursor.fetchone():
        cursor.close(); conn.close()
        return jsonify({
            'status': 0,
            'msg': f"Employee with address '{employee_id}' already registered."
        }), 409

    try:
        cursor.execute(
            """
            INSERT INTO employees (employee_id, password_hash, fname, lname, revenue_dept_id)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (employee_id, generate_password_hash(password), fname, lname, revenue_dept_id)
        )
        conn.commit()
        print(f"Employee {fname} {lname} added to database successfully")
    except Exception as e:
        cursor.close(); conn.close()
        return jsonify({'status': 0, 'msg': f"Database error: {e}"})

    cursor.close(); conn.close()

    # Blockchain transaction
    try:
        res = mapRevenueDeptIdToEmployee(revenue_dept_id, employee_id)
        if res:
            return jsonify({'status': 1, 'msg': f"Employee '{fname}' Added Successfully"})
        return jsonify({'status': 0, 'msg': "Employee added to database but blockchain transaction failed"})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'status': 0, 'msg': f"Employee added but blockchain error: {e}"})


# ── Startup: ensure admin account exists ─────────────────────────────────────
def ensure_admin():
    if not adminAddress or not adminPassword:
        print("Admin Address Details Not found in Configuration file")
        return

    conn   = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id FROM employees WHERE admin_address = %s", (adminAddress,)
    )
    admin = cursor.fetchone()

    if admin is None:
        print("\nAdding Admin Details To Database")
        cursor.execute(
            "INSERT INTO employees (admin_address, password_hash) VALUES (%s, %s)",
            (adminAddress, generate_password_hash(adminPassword))
        )
        conn.commit()
        print("Admin added successfully")
    else:
        print("\nUpdating Admin Details in Database to match Config")
        cursor.execute(
            "UPDATE employees SET admin_address = %s, password_hash = %s WHERE admin_address = %s",
            (adminAddress, generate_password_hash(adminPassword), adminAddress)
        )
        conn.commit()

    cursor.close(); conn.close()


if __name__ == '__main__':
    ensure_admin()
    app.run(debug=True, port=5001)
