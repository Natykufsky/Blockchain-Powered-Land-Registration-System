


async function checkConnection() {
  if (window.ethereum) {
    try {
      window.web3 = new Web3(ethereum);

      const networkId = await web3.eth.net.getId();
      console.log("Network ID:", networkId);

      if (networkId != 5777) {
        alertUser("Please connect to Ganache Network (ID: 5777) in MetaMask.", "alert-warning", "block");
        return;
      }

      const accounts = await web3.eth.getAccounts();
      const accountConnectedToMetaMask = accounts[0];

      console.log("Account Connected to MetaMask:", accountConnectedToMetaMask);
      console.log("Account used to login        :", window.localStorage["userAddress"]);

      if (accountConnectedToMetaMask != window.localStorage["userAddress"]) {
        alertUser("Mismatch in account used to login and connected to MetaMask. Please login again.", "alert-danger", "block");
        setTimeout(() => { window.location.href = "/"; }, 3000);
      } else {
        console.log("No Account changes detected !!");
        fetchUserDetails();
        fetchPropertiesOfOwner();
      }
    } catch (error) {
      console.error("Connection error:", error);
      if (error.code === 4001) {
        alertUser("Connection rejected by user. Please try again.", "alert-danger", "block");
      } else {
        alertUser(showError(error), "alert-danger", "block");
      }
    }
  } else {
    alertUser("Please Add Metamask extension for your browser !!", "alert-warning", "block");
  }
}



async function fetchUserDetails() {

  let contractABI = JSON.parse(window.localStorage.Users_ContractABI);
  let contractAddress = window.localStorage.Users_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  userDetails = await contract.methods.users(accountUsedToLogin)
    .call()
    .then(
      function (value) {
        return value;
      });


  if (userDetails["userID"] == accountUsedToLogin) {

    document.getElementById("nameOfUser").innerText = userDetails["firstName"];

    // document.getElementById("lname").innerText = userDetails["lastName"];

    // document.getElementById("account").innerText = userDetails["userID"];

    // document.getElementById("dob").innerText = userDetails["dateOfBirth"];

    // document.getElementById("ninNumber").innerText = userDetails["ninNumber"];
  }
  else {
    alertUser("Account Not Found !! Please Login again", "alert-danger", "block");
  }

}



function toggleShowProperties() {
  document.getElementById("addProperty").style.display = "none";
  document.getElementById("propertiesTable").style.display = "block";

  // change dashboard to addproperty button
  addPropertyButtonDiv = document.getElementById("addPropertyButtonDiv");
  addPropertyButtonDiv.innerText = "Add Property";
  addPropertyButtonDiv.onclick = toggleAddProperty;

  document.getElementById("notifyUser").style.display = "none";

  fetchPropertiesOfOwner();
}


function toggleAddProperty() {
  document.getElementById("propertiesTable").style.display = "none";
  document.getElementById("addProperty").style.display = "block";

  document.getElementById("notifyUser").style.display = "none";


  addPropertyButtonDiv = document.getElementById("addPropertyButtonDiv");
  // change add Property button to dashboard
  addPropertyButtonDiv.innerText = "Dashboard";
  addPropertyButtonDiv.onclick = toggleShowProperties;

}


async function addProperty(event) {

  event.preventDefault();

  notifyUser = document.getElementById("notifyUser");
  notifyUser.style.display = "none";

  let location = document.getElementById("location").value;

  let revenueDeptId = document.getElementById("revenueDeptId").value;

  let surveyNo = document.getElementById("suveyNumber").value;

  let area = document.getElementById("area").value;

  let contractABI = JSON.parse(window.localStorage.LandRegistry_ContractABI);

  let contractAddress = window.localStorage.LandRegistry_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  try {


    showTransactionLoading("Adding Your Land...")

    landAddedEvent = await contract.methods.addLand(
      location,
      revenueDeptId,
      surveyNo,
      area
    ).send(
      { from: accountUsedToLogin }
    ).then(
      function (tx) {
        return tx.events.LandAdded.returnValues;
      });

    console.log(landAddedEvent["owner"] + " added with ID:" + landAddedEvent["propertyId"]);



    showTransactionLoading(`Uploading Documents...`);

    // Documents data to store in local mongo db 
    propertyDocs = document.getElementById("registrationDoc").files[0];

    owner = landAddedEvent["owner"];
    propertyId = landAddedEvent["propertyId"];

    // Create a new FormData object
    const formData = new FormData();

    // Append the files and data to the FormData object
    formData.append('propertyDocs', propertyDocs);
    formData.append('owner', owner);
    formData.append('propertyId', propertyId);
    formData.append('surveyNo', surveyNo);  // Add for duplicate detection
    formData.append('area', area);  // Add for duplicate detection

    // Send a POST request to the Flask server
    fetch('/uploadPropertyDocs', {
      method: 'POST',
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        console.log(data);
        closeTransactionLoading();

        if (data['status'] === 'success') {
          alertUser("<strong>Success!</strong> Land & Documents have been registered on the blockchain and saved to our records.", "alert-success", "block");

          // Reset the form
          const form = document.getElementById("addPropertyForm");
          if (form) form.reset();

          fetchPropertiesOfOwner();
          // Switching back to properties view after a delay to show success
          setTimeout(() => toggleShowProperties(), 5000);
        } else {
          let errorMsg = data['reason'] || "Failed to Upload Documents";
          if (errorMsg.includes("Connection refused") || errorMsg.includes("localhost:27017")) {
            errorMsg = "Database Connection Error: Please ensure MongoDB is running.";
          }
          alertUser(errorMsg, "alert-danger", "block");
        }
      })
      .catch(error => {
        console.error(error);
        closeTransactionLoading();
        let errorMsg = "Failed Uploading Documents. System offline?";
        alertUser(errorMsg, "alert-danger", "block");
      });



  }
  catch (error) {
    console.error("Error in addProperty:", error);
    closeTransactionLoading();
    alertUser(showError(error), "alert-danger", "block");
  }



}


async function fetchPropertiesOfOwner() {
  let contractABI = JSON.parse(window.localStorage.LandRegistry_ContractABI);

  let contractAddress = window.localStorage.LandRegistry_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  try {

    properties = await contract.methods.getPropertiesOfOwner(
      accountUsedToLogin
    ).call()
      .then(function (value) {
        return value;
      });
    console.log(properties);


    let tableBody = document.getElementById("propertiesTableBody");

    let tableBodyCode = "";
    let tableRow = "";

    for (let i = 0; i < properties.length; i++) {
      tableRow = "<tr class='hover:bg-white/5 transition-colors border-b border-white/5'>";
      tableRow += "<td class='px-6 py-4 text-sm'>" + (i + 1) + "</td>";
      tableRow += "<td class='px-6 py-4 text-sm font-mono text-slate-400'>" + properties[i]["propertyId"] + "</td>";
      tableRow += "<td class='px-6 py-4 text-sm'>" + properties[i]["locationId"] + "</td>";
      tableRow += "<td class='px-6 py-4 text-sm'>" + properties[i]["revenueDepartmentId"] + "</td>";
      tableRow += "<td class='px-6 py-4 text-sm'>" + properties[i]["surveyNumber"] + "</td>";
      tableRow += "<td class='px-6 py-4 text-sm'>" + properties[i]["area"] + "</td>";
      tableRow += "<td class='px-6 py-4 text-sm'> <button class='bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-lg border border-indigo-500/30 transition-all text-xs font-semibold' onclick=showPdf(" + properties[i]["propertyId"] + ")> VIEW PDF </button></td>";

      tableRow += "<td class='px-6 py-4 text-sm'>" + handleStateOfProperty(properties[i]) + "</td>";

      tableRow += "<td class='px-6 py-4 text-sm'>" + showSoldButton(properties[i]) + "</td>";

      tableRow += "</tr>";

      tableBodyCode += tableRow;
    }

    if (tableBodyCode == "") {
      tableBodyCode = `<tr><td colspan='9' class='px-6 py-12 text-center text-slate-500'> You Have No Properties </td></tr>`;
    }

    tableBody.innerHTML = tableBodyCode;

  }
  catch (error) {
    console.log(error);
  }

}


// function to create State of properties
function handleStateOfProperty(property) {
  properyState = property["state"]
  propertyId = property["propertyId"]
  // 0 => Created: uploaded by user.
  // 1 => Scheduled: Scheduled by Verifier for verification.
  // 2 => Verified: verified by verifier.
  // 3 => Rejected: rejected by verifier.

  if (properyState == 0) {
    return "<span class='px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium border border-amber-500/20'>Under Verification</span>";
  }
  else if (properyState == 1) {
    return "<span class='px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium border border-blue-500/20'>Scheduled on " + property["scheduledDate"] + "</span>";
  }
  else if (properyState == 2) {
    return "<span class='px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20'>Verified</span>";
  }
  else if (properyState == 3) {
    return "<span class='px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20'>Rejected</span>";
  }
  else if (properyState == 4) {
    return "<span class='px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20'>On Sale</span>";
  }
  else if (properyState == 5) {
    return "<span class='px-2 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-medium border border-slate-500/20'>Bought</span>";
  }
  else {
    console.log("Invalid State");
    return "Invalid";
  }
}


function showSoldButton(property) {
  properyState = property["state"]
  propertyId = property["propertyId"]

  if (properyState == 2 || properyState == 5) {
    htmlCode = "<button class='bg-primary/20 hover:bg-primary/30 text-primary px-4 py-1.5 rounded-lg border border-primary/30 transition-all text-xs font-bold uppercase tracking-wider' onclick=makePropertyAvailableToSell("
      + propertyId
      + ")> Sell Property </button>"

    return htmlCode;
  }
  else if (properyState == 4) {
    return "Already On Sale";
  }
  else {
    return "Not Allowed Yet";
  }

}


async function makePropertyAvailableToSell(propertyId) {

  alertUser("", "alert-info", "none");

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  // price = prompt("Enter price of Land[in ether]:");
  price = await showPrompt().then((value) => {
    return value;
  });


  if (price != null && price != "") {


    try {

      showTransactionLoading("Making available to sell...");

      // Workaround: Convert to Wei since smart contract's convertToWei only works with integers
      const priceInWei = web3.utils.toWei(price, 'ether');

      saleAddedEvent = await contract.methods.addPropertyOnSale(
        propertyId,
        priceInWei  // Send Wei directly, accepting double conversion
      ).send(
        { from: accountUsedToLogin }
      ).then(
        function (tx) {
          return tx.events.PropertyOnSale.returnValues;
        });

      console.log(saleAddedEvent["owner"] + " made available this property:"
        + saleAddedEvent["propertyId"] + " on sale id"
        + saleAddedEvent["saleId"]
      );


      closeTransactionLoading();
      alertUser("Successfully added to Sales List", "alert-success", "block");
      fetchPropertiesOfOwner();

    }
    catch (error) {
      console.error("Error in makePropertyAvailableToSell:", error);
      closeTransactionLoading();
      alertUser(showError(error), "alert-danger", "block");
    }

  }
  else {

    alertUser("Please Enter Price", "alert-info", "block");
  }

}



// Refresh button logic
function refreshProperties() {
  fetchPropertiesOfOwner();
  alertUser("Refreshing property data...", "alert-info", "block");
  setTimeout(() => alertUser("", "", "none"), 2000);
}

// function to show Registered pdfs
function showPdf(propertyId) {
  const frame = document.getElementById('pdf-frame');
  frame.src = `/propertiesDocs/pdf/${propertyId}`;

  const popup = document.querySelector('.pdf-popup');
  popup.classList.remove('hidden');
  popup.classList.add('flex');
}

function closePopup() {
  const popup = document.querySelector('.pdf-popup');
  popup.classList.add('hidden');
  popup.classList.remove('flex');
}




function showTransactionLoading(msg) {
  const loadingDiv = document.getElementById("loadingDiv");
  const loadingSpan = document.getElementById("loadingSpan");
  if (loadingSpan) {
    loadingSpan.innerHTML = msg || "Processing...";
  }
  loadingDiv.style.display = "flex";
}

function closeTransactionLoading() {
  loadingDiv = document.getElementById("loadingDiv");

  loadingDiv.style.display = "none";
}


// show error reason to user
function showError(errorOnTransaction) {
  if (!errorOnTransaction) return "Unknown Error";

  // User rejection
  if (errorOnTransaction.code === 4001) {
    return "Transaction rejected by user.";
  }

  // If there's a nested error in message (common with MetaMask/Ganache)
  if (errorOnTransaction.message && errorOnTransaction.message.includes('{')) {
    try {
      const start = errorOnTransaction.message.indexOf('{');
      const errorObj = JSON.parse(errorOnTransaction.message.slice(start));

      // Try to find reason in nested structure
      if (errorObj.value && errorObj.value.data && errorObj.value.data.data) {
        const nestedData = errorObj.value.data.data;
        const txHash = Object.getOwnPropertyNames(nestedData)[0];
        if (nestedData[txHash] && nestedData[txHash].reason) {
          return nestedData[txHash].reason;
        }
      }

      if (errorObj.message) return errorObj.message;
    } catch (e) {
      console.error("Error parsing complex error message", e);
    }
  }

  return errorOnTransaction.reason || errorOnTransaction.message || "An error occurred during transaction";
}


function alertUser(msg, msgType, display) {
  const notifyUser = document.getElementById("notifyUser");
  notifyUser.classList = "mb-6 p-4 rounded-xl text-sm font-medium transition-all duration-300";

  if (msgType === "alert-success") {
    notifyUser.classList.add("bg-emerald-500/10", "border", "border-emerald-500/20", "text-emerald-400");
  } else if (msgType === "alert-danger") {
    notifyUser.classList.add("bg-red-500/10", "border", "border-red-500/20", "text-red-400");
  } else if (msgType === "alert-warning") {
    notifyUser.classList.add("bg-amber-500/10", "border", "border-amber-500/20", "text-amber-500");
  } else {
    notifyUser.classList.add("bg-primary/10", "border", "border-primary/20", "text-primary");
  }

  notifyUser.innerHTML = msg;
  if (display === "block" || display === "flex") {
    notifyUser.classList.remove("hidden");
  } else {
    notifyUser.classList.add("hidden");
  }
}




function showPrompt() {
  // Get the necessary elements
  const containerBackCover = document.getElementById('prompt-container-backcover');
  const container = document.getElementById('prompt-container');
  const input = document.getElementById('prompt-input');
  const okButton = document.getElementById('prompt-ok');
  const cancelButton = document.getElementById('prompt-cancel');

  // Show the prompt container
  containerBackCover.classList.remove('hidden');
  containerBackCover.classList.add('flex');

  // make input as empty
  input.value = "";

  // Return a Promise that resolves with the input value when "OK" is clicked, or null when "Cancel" is clicked
  return new Promise((resolve, reject) => {
    okButton.onclick = () => {
      containerBackCover.classList.add('hidden');
      containerBackCover.classList.remove('flex');
      resolve(input.value);
    };
    cancelButton.onclick = () => {
      containerBackCover.classList.add('hidden');
      containerBackCover.classList.remove('flex');
      resolve(null);
    };
  });
}

