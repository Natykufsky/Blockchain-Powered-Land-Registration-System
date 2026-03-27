from flask import Flask, jsonify, render_template, request, Response, redirect
import mysql.connector
from mysql.connector import pooling
from web3 import Web3, HTTPProvider
import json
import os
import mimetypes


# ── Config ────────────────────────────────────────────────────────────────────
basedir = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(basedir, "config.json"), "r") as f:
    config = json.load(f)

NETWORK_CHAIN_ID = str(config["NETWORK_CHAIN_ID"])


# ── MySQL connection pool ─────────────────────────────────────────────────────
db_pool = pooling.MySQLConnectionPool(
    pool_name="users_pool",
    pool_size=5,
    host=config["MySQL_Host"],
    port=config.get("MySQL_Port", 3306),
    user=config["MySQL_User"],
    password=config["MySQL_Password"],
    database="LandRegistry"
)

def get_db():
    """Return a connection from the pool."""
    return db_pool.get_connection()


# ── Flask app ─────────────────────────────────────────────────────────────────
app = Flask(
    __name__,
    static_url_path='',
    static_folder='web/static',
    template_folder='web/templates'
)
app.secret_key = config["Secret_Key"]


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/register')
def register():
    return render_template('register.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html', add_property=True, current_user_address=True)


@app.route('/uploadPropertyDocs', methods=['POST'])
def upload():
    try:
        registration_docs = request.files['propertyDocs']
        owner       = request.form['owner']
        property_id = request.form['propertyId']
        survey_no   = request.form.get('surveyNo', '')
        area        = request.form.get('area', '')

        # Detect MIME type from the uploaded filename
        original_filename = registration_docs.filename or ''
        mime_type, _ = mimetypes.guess_type(original_filename)
        if not mime_type:
            mime_type = registration_docs.content_type or 'application/octet-stream'

        # Allowed types: PDF + common image formats
        ALLOWED_MIMES = {
            'application/pdf', 'image/jpeg', 'image/png',
            'image/gif', 'image/webp', 'image/bmp', 'image/tiff'
        }
        if mime_type not in ALLOWED_MIMES:
            return jsonify({
                'status': 'Failed Uploading Files',
                'reason': f'Unsupported file type: {mime_type}. Upload PDF or an image.',
                'fileId': '0'
            }), 400

        ext = os.path.splitext(original_filename)[1] or ('.pdf' if 'pdf' in mime_type else '')
        filename  = f"{owner}_{property_id}{ext}"
        file_data = registration_docs.read()

        conn   = get_db()
        cursor = conn.cursor(dictionary=True)

        # Duplicate check by property_id
        cursor.execute(
            "SELECT id FROM property_docs WHERE property_id = %s", (property_id,)
        )
        if cursor.fetchone():
            cursor.close(); conn.close()
            return jsonify({
                'status': 'Failed Uploading Files',
                'reason': 'Documents for this property already exist.',
                'fileId': '0'
            }), 400

        # Duplicate check by survey_no + area
        if survey_no and area:
            cursor.execute(
                "SELECT id FROM property_docs WHERE survey_no = %s AND area = %s",
                (survey_no, area)
            )
            if cursor.fetchone():
                cursor.close(); conn.close()
                return jsonify({
                    'status': 'Failed Uploading Files',
                    'reason': f'A property with Survey No: {survey_no} and Area: {area} sq ft already exists.',
                    'fileId': '0'
                }), 400

        cursor.execute(
            """
            INSERT INTO property_docs (owner, property_id, survey_no, area, mime_type, filename, file_data)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (owner, property_id, survey_no, area, mime_type, filename, file_data)
        )
        conn.commit()
        new_id = cursor.lastrowid
        cursor.close(); conn.close()

        return jsonify({'status': 'success', 'fileId': str(new_id)})

    except Exception as e:
        print(f"Error during file upload: {e}")
        return jsonify({'status': 'Failed Uploading Files', 'reason': str(e), 'fileId': '0'}), 500


@app.route('/propertiesDocs/pdf/<propertyId>')
def get_pdf(propertyId):
    try:
        conn   = get_db()
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
        conn   = get_db()
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
    try:
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
    except KeyError:
        return jsonify({
            "status": 0,
            "Reason": f"Contracts not found for Network ID: {NETWORK_CHAIN_ID}. "
                      "Please ensure contracts are deployed and check your config.json."
        }), 500


@app.route('/logout')
def logout():
    return redirect('/')


@app.route('/availableToBuy')
def availableToBuy():
    return render_template('availableToBuy.html', current_user_address=True)


@app.route('/MySales')
def MySales():
    return render_template('mySales.html', current_user_address=True)


@app.route('/myRequestedSales')
def myRequestedSales():
    return render_template('myRequestedSales.html', current_user_address=True)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)
