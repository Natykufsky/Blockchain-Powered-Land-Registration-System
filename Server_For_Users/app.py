from flask import Flask, jsonify,render_template,request,Response,redirect # Triggering reload
from pymongo import MongoClient, errors
import gridfs
from web3 import Web3, HTTPProvider
import json
import os


# Get configuration info
basedir = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(basedir, "config.json"), "r") as f:
    config = json.load(f)

# blockchain Network ID
NETWORK_CHAIN_ID = str(config["NETWORK_CHAIN_ID"])


# connect to mong db
client = MongoClient(config["Mongo_Db_Url"])

# connect to database
LandRegistryDB = client.LandRegistry

# connect to file System
fs = gridfs.GridFS(LandRegistryDB)

# connect to collection
propertyDocsTable = LandRegistryDB.Property_Docs


app = Flask(
    __name__,
    static_url_path='', 
    static_folder='web/static',
    template_folder='web/templates'
)

# flask secret key
app.secret_key = config["Secret_Key"]





@app.route('/')
def index():
    # Render the 'index.html' template with the variables passed in
    return render_template('index.html')


@app.route('/register')
def register():
    return render_template('register.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html', add_property=True, current_user_address=True)



@app.route('/uploadPropertyDocs', methods=['POST'])
def upload():
    # Get the uploaded files and form data from the request
    try:
        registraionDocs = request.files['propertyDocs']
        owner = request.form['owner']
        propertyId = request.form['propertyId']
        
        # Get survey number and area from form if available for better duplicate checking
        surveyNo = request.form.get('surveyNo', '')
        area = request.form.get('area', '')

        # Check if documents for this property already exist by propertyId
        # PropertyId check is still useful to prevent re-uploading for same blockchain property
        existing_doc = propertyDocsTable.find_one({"Property_Id": propertyId})
        if existing_doc:
            return jsonify({'status': 'Failed Uploading Files', 'reason': 'Documents for this property already exist.', 'fileId': str(0)}), 400

        # Additional check: If survey number and area are provided, check for duplicates
        # This catches cases where same physical property was registered with different propertyId
        if surveyNo and area:
            duplicate_property = propertyDocsTable.find_one({
                "Survey_No": surveyNo,
                "Area": area
            })
            if duplicate_property:
                return jsonify({
                    'status': 'Failed Uploading Files', 
                    'reason': f'A property with Survey No: {surveyNo} and Area: {area} sq ft already exists.', 
                    'fileId': str(0)
                }), 400

        file_id = fs.put(registraionDocs, filename="%s_%s.pdf"%(owner,propertyId))
        rowId = propertyDocsTable.insert_one({
                                            "Owner":owner,
                                            "Property_Id":propertyId,
                                            "Survey_No": surveyNo,
                                            "Area": area,
                                            "%s_%s.pdf"%(owner,propertyId):file_id
                                        }).inserted_id
        return jsonify({'status': 'success','fileId':str(file_id)})

    except Exception as e:
        print(f"Error during file upload: {str(e)}")
        # Return a response to the client
        return jsonify({'status': 'Failed Uploading Files', 'reason': str(e), 'fileId': str(0)}), 500
    
                                    

@app.route('/propertiesDocs/pdf/<propertyId>')
def get_pdf(propertyId):
  try:
    try:
        propertyDetails = propertyDocsTable.find({"Property_Id":"%s"%(propertyId)})[0]
        
    except IndexError as e:
        return jsonify({"status":0,"Reason":"No Property Matched With Id"})

    fileName = "%s_%s.pdf"%(propertyDetails['Owner'],propertyDetails['Property_Id'])
    
    file = fs.get(propertyDetails[fileName])

    response = Response(file, content_type='application/pdf')
    response.headers['Content-Disposition'] = f'inline; filename="{file.filename}"'
    
    return response

  except Exception as e:
    return jsonify({"status":0,"Reason":str(e)})




@app.route('/fetchContractDetails')
def fetchContractDetails():
    usersContract = json.loads(
            open(
                    os.path.join(basedir, "..", "Smart_contracts", "build", "contracts", "Users.json")
                    ).read()
        )
    
    landRegistryContract = json.loads(
            open(
                    os.path.join(basedir, "..", "Smart_contracts", "build", "contracts", "LandRegistry.json")
                    ).read()
        )

    transferOwnerShip = json.loads(
            open(
                    os.path.join(basedir, "..", "Smart_contracts", "build", "contracts", "TransferOwnerShip.json")
                    ).read()
        )

    try:
        response = {}

        response["Users"] = {}
        response["Users"]["address"] = usersContract["networks"][NETWORK_CHAIN_ID]["address"]
        response["Users"]["abi"] = usersContract["abi"]

        response["LandRegistry"]  = {}
        response["LandRegistry"]["address"] = landRegistryContract["networks"][NETWORK_CHAIN_ID]["address"]
        response["LandRegistry"]["abi"] = landRegistryContract["abi"]

        response["TransferOwnership"]  = {}
        response["TransferOwnership"]["address"] = transferOwnerShip["networks"][NETWORK_CHAIN_ID]["address"]
        response["TransferOwnership"]["abi"] = transferOwnerShip["abi"]

        return response
    except KeyError:
        return jsonify({
            "status": 0,
            "Reason": f"Contracts not found for Network ID: {NETWORK_CHAIN_ID}. "
                     f"Please ensure contracts are deployed to this network and check your config.json."
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
    app.run(debug=True,host='0.0.0.0',port=5002)
