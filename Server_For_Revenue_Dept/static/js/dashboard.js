
async function checkConnection() {
  if (window.ethereum) {
    try {
      window.web3 = new Web3(ethereum);
      const accounts = await web3.eth.getAccounts();
      const accountConnectedToMetaMask = accounts[0];

      if (accountConnectedToMetaMask.toLowerCase() != window.localStorage["employeeId"].toLowerCase()) {
        alertUser("Account Mismatch: Please switch MetaMask to the account you logged in with.", "alert-danger", "block");
      } else {
        document.getElementById("revenueDeptId").innerText = window.localStorage.revenueDepartmentId;
        document.getElementById('nameOfUser').innerText = window.localStorage.empName;
        fetchPropertiesUnderControl(window.localStorage.revenueDepartmentId);
      }
    } catch (error) {
      alertUser(showError(error), "alert-danger", "block");
    }
  } else {
    alertUser("Please install MetaMask to use this portal.", "alert-warning", "block");
  }
}

async function fetchPropertiesUnderControl(revenueDepartmentId) {
  let contractABI = JSON.parse(window.localStorage.LandRegistry_ContractABI);
  let contractAddress = window.localStorage.LandRegistry_ContractAddress;
  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  try {
    const properties = await contract.methods.getPropertiesByRevenueDeptId(revenueDepartmentId).call();
    let tableBody = document.getElementById("propertiesTableBody");
    let tableBodyCode = "";

    for (let i = 0; i < properties.length; i++) {
      // Table row with Tailwind classes (to be supported by dashboard.html)
      let tableRow = "<tr class='hover:bg-white/5 transition-colors border-b border-white/5'>";
      tableRow += "<td class='px-6 py-4 text-sm font-mono'>" + properties[i]["propertyId"] + "</td>";
      tableRow += "<td class='px-6 py-4 text-sm'>" + properties[i]["locationId"] + "</td>";
      tableRow += "<td class='px-6 py-4 text-sm'>" + properties[i]["surveyNumber"] + "</td>";
      tableRow += "<td class='px-6 py-4 text-sm'>" + properties[i]["area"] + "</td>";
      tableRow += "<td class='px-6 py-4 text-sm'><button class='btn-action btn-pdf' onclick=showPdf(" + properties[i]["propertyId"] + ")>View PDF</button></td>";
      tableRow += "<td class='px-6 py-4 text-sm'>" + handleStateOfProperty(properties[i]) + "</td>";
      tableRow += "</tr>";
      tableBodyCode += tableRow;
    }

    if (tableBodyCode === "") {
      tableBodyCode = "<tr><td colspan='6' class='px-6 py-12 text-center text-slate-500'>No properties pending for your department.</td></tr>";
    }
    tableBody.innerHTML = tableBodyCode;
  }
  catch (error) {
    console.error(error);
    alertUser("Failed to fetch properties: " + showError(error), "alert-danger", "block");
  }
}

async function acceptProperty(propertyId) {
  let contractABI = JSON.parse(window.localStorage.LandRegistry_ContractABI);
  let contractAddress = window.localStorage.LandRegistry_ContractAddress;
  let contract = new window.web3.eth.Contract(contractABI, contractAddress);
  let accountUsedToLogin = window.localStorage["employeeId"];

  try {
    showTransactionLoading("Verifying property on blockchain...");
    await contract.methods.verifyProperty(propertyId).send({ from: accountUsedToLogin });
    closeTransactionLoading();
    alertUser("Property verified successfully!", "alert-success", "block");
    fetchPropertiesUnderControl(window.localStorage.revenueDepartmentId);
  }
  catch (error) {
    closeTransactionLoading();
    console.error(error);
    alertUser("Verification Failed: " + showError(error), "alert-danger", "block");
  }
}

async function rejectProperty(propertyId) {
  let contractABI = JSON.parse(window.localStorage.LandRegistry_ContractABI);
  let contractAddress = window.localStorage.LandRegistry_ContractAddress;
  let contract = new window.web3.eth.Contract(contractABI, contractAddress);
  let accountUsedToLogin = window.localStorage["employeeId"];

  try {
    showTransactionLoading("Rejecting property on blockchain...");
    await contract.methods.rejectProperty(propertyId, "Documents are not clear").send({ from: accountUsedToLogin });
    closeTransactionLoading();
    alertUser("Property rejected successfully.", "alert-warning", "block");
    fetchPropertiesUnderControl(window.localStorage.revenueDepartmentId);
  }
  catch (error) {
    closeTransactionLoading();
    console.error(error);
    alertUser("Rejection Failed: " + showError(error), "alert-danger", "block");
  }
}

function handleStateOfProperty(property) {
  let propertyState = property["state"];
  if (propertyState == 0) {
    return "<div class='flex gap-2 justify-center'>" +
      "<button class='btn-action btn-accept' onclick=acceptProperty(" + property["propertyId"] + ")>Accept</button>" +
      "<button class='btn-action btn-reject' onclick=rejectProperty(" + property["propertyId"] + ")>Reject</button>" +
      "</div>";
  } else if (propertyState == 2 || propertyState == 4 || propertyState == 5) {
    return "<span class='px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold border border-emerald-500/20'>Verified</span>";
  } else if (propertyState == 3) {
    return "<span class='px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-bold border border-red-500/20'>Rejected</span>";
  }
  return "<span class='text-slate-500'>-</span>";
}


function refreshDeptProperties() {
  fetchPropertiesUnderControl(window.localStorage.revenueDepartmentId);
  alertUser("Refreshing department properties...", "alert-info", "block");
  setTimeout(() => alertUser("", "", "none"), 2000);
}

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
  document.getElementById("loadingText").innerText = msg || "Processing...";
  loadingDiv.style.display = "flex";
}

function closeTransactionLoading() {
  document.getElementById("loadingDiv").style.display = "none";
}

function alertUser(msg, msgType, display) {
  const notifyUser = document.getElementById("notifyUser");
  if (!notifyUser) return;
  notifyUser.classList = "mb-6 p-4 rounded-xl text-sm font-medium transition-all duration-300";
  if (msgType === "alert-success") notifyUser.classList.add("bg-emerald-500/10", "border", "border-emerald-500/20", "text-emerald-400");
  else if (msgType === "alert-danger") notifyUser.classList.add("bg-red-500/10", "border", "border-red-500/20", "text-red-400");
  else if (msgType === "alert-warning") notifyUser.classList.add("bg-amber-500/10", "border", "border-amber-500/20", "text-amber-500");
  notifyUser.innerHTML = msg;
  notifyUser.style.display = display === "block" ? "block" : "none";
}

function showError(error) {
  if (error.message && error.message.includes("Only the revenue department employee")) {
    return "Access Denied: Your account is not authorized for this department on the blockchain.";
  }
  return error.reason || error.message || "An unknown error occurred.";
}
