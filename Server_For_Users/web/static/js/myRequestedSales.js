



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
        fetchMyRequestedSales();
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



async function getStatusOfPurchseRequest(saleId) {

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  try {

    requestedUsersForASale = await contract.methods.getRequestedUsers(
      saleId
    ).call()
      .then(function (value) {
        return value;
      });


    for (let i = 0; i < requestedUsersForASale.length; i++) {

      buyer = requestedUsersForASale[i]["user"];

      if (buyer == accountUsedToLogin) {
        // covert price to ethers
        price = web3.utils.fromWei(requestedUsersForASale[i]["priceOffered"]);
        state = requestedUsersForASale[i]["state"];

        return {
          buyerAddress: buyer,
          priceOffered: price,
          state: state
        };
      }

    }

  }
  catch (error) {
    console.error("Error in getStatusOfPurchseRequest:", error);
    alertUser(showError(error), "alert-danger", "block");
  }
}



async function fetchMyRequestedSales() {


  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  try {

    myRequestedSales = await contract.methods.getRequestedSales(
      accountUsedToLogin
    ).call()
      .then(function (value) {
        return value;
      });

    console.log(myRequestedSales);


    let tableBody = document.getElementById("salesTableBody");

    let tableBodyCode = "";
    let tableRow = "";

    let saleId = "";

    for (let i = 0; i < myRequestedSales.length; i++) {

      saleId = myRequestedSales[i]["saleId"];

      statusOfPurchseRequestSent = await getStatusOfPurchseRequest(saleId);

      // Debug logging to verify conversions
      console.log(`Sale ${saleId}:`);
      console.log(`  - Price from blockchain (Wei): ${myRequestedSales[i]["price"]}`);
      console.log(`  - Price converted (Ether): ${web3.utils.fromWei(myRequestedSales[i]["price"])}`);
      console.log(`  - Offered price (Ether): ${statusOfPurchseRequestSent.priceOffered}`);

      tableRow = "<tr class='hover:bg-white/5 transition-colors border-b border-white/5'>";

      tableRow += `<td class='px-6 py-4 text-sm'>${i + 1}</td>`;
      tableRow += `<td class='px-6 py-4 text-sm font-mono text-slate-400'>${saleId}</td>`;
      tableRow += `<td class='px-6 py-4 text-sm font-mono text-slate-400'>${myRequestedSales[i]["propertyId"]}</td>`;
      tableRow += `<td class='px-6 py-4 text-sm font-bold text-slate-300'>${web3.utils.fromWei(myRequestedSales[i]["price"])} ETH</td>`;
      tableRow += `<td class='px-6 py-4 text-sm font-bold text-emerald-400'>${statusOfPurchseRequestSent.priceOffered} ETH</td>`;


      tableRow += "<td class='px-6 py-4 text-sm'>" + handleStateOfPurchaseRequestSent(statusOfPurchseRequestSent.state) + "</td>";
      tableRow += "<td class='px-6 py-4 text-sm flex gap-2'>" + addOptionsBasedOnState(statusOfPurchseRequestSent, myRequestedSales[i]) + "</td>";

      tableRow += "</tr>";

      tableBodyCode += tableRow;
    }

    tableBody.innerHTML = tableBodyCode;


  }
  catch (error) {
    console.error("Error in fetchMyRequestedSales:", error);
    alertUser(showError(error), "alert-danger", "block");
  }
}



function addOptionsBasedOnState(statusOfPurchseRequestSent, sale) {

  res = null;

  state = statusOfPurchseRequestSent.state;

  saleId = sale["saleId"];
  saleState = sale["state"];

  priceOffered = statusOfPurchseRequestSent.priceOffered;

  if (saleState == 2) {
    res = `<span class='text-red-400 text-xs font-bold uppercase'>Sale Terminated</span>`;
  }
  else if (saleState == 3) {
    res = `<span class='text-slate-500 text-xs font-bold uppercase'>Sale Closed</span>`;
  }
  else if (state == 0 || state == 6) {
    res = `<button class="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1 rounded-lg border border-red-500/20 transition-all text-xs font-semibold" onclick="cancelPurchaseRequestSentToSeller(${saleId})"> Cancel Request </button>`;
  }
  else if (state == 1 || state == 3 || state == 4 || state == 5) {
    if (saleState == 0) {
      res = `<button class="bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-lg border border-primary/20 transition-all text-xs font-semibold" onclick="rerequestPurchaseRequest(${saleId})"> Re-Request </button>`;
    }
    else {
      res = `<span class='text-slate-500 text-xs font-bold'>Sale Inactive</span>`;
    }
  }
  else if (state == 2) {
    res = `<button onclick="makePayment(${saleId}, ${priceOffered})" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg transition-all text-xs font-bold shadow-lg shadow-emerald-500/20"> Make Payment </button> 
           <button onclick="rejectingAcceptanceRequestByBuyer(${saleId})" class="bg-white/5 hover:bg-white/10 text-white px-3 py-1 rounded-lg border border-white/10 transition-all text-xs font-semibold"> Cancel </button>`;
  }
  else {
    res = "<span class='text-slate-600 text-xs'>No options</span>";
  }

  return res;

}


function handleStateOfPurchaseRequestSent(state) {


  if (state == 0) {
    return "<span class='px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium border border-blue-500/20'>Sent Request</span>";
  }
  else if (state == 1) {
    return "<span class='px-2 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-medium border border-slate-500/20'>Canceled Request</span>";
  }
  else if (state == 2) {
    return "<span class='px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20'>Seller Accepted</span>"
  }
  else if (state == 3) {
    return "<span class='px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20'>Seller Rejected</span>";
  }
  else if (state == 4) {
    return "<span class='px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 text-center'>Permission Rejected</span>"
  }
  else if (state == 5) {
    return "<span class='px-2 py-1 rounded-full bg-slate-500/10 text-slate-400 text-xs font-medium border border-slate-500/20'>Canceled Acceptance</span>";
  }
  else if (state == 6) {
    return "<span class='px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium border border-amber-500/20'>Re-Requested</span>";
  }
  else if (state == 7) {
    return "<span class='px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30'>Purchase Success</span>";
  }
  else {
    return "<span class='text-slate-600 text-xs'>Invalid State</span>";
  }


}



async function makePayment(saleId, priceOffered) {

  alertUser("", "alert-info", "none");

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  // Convert price to Wei for payment (msg.value must be in Wei)
  priceOffered = web3.utils.toWei(String(priceOffered), 'ether');
  console.log("saleId:", saleId);
  console.log("priceOffered (Wei):", priceOffered);

  try {

    showTransactionLoading("Payment in progress...");

    await contract.methods.transferOwnerShip(
      saleId
    )
      .send(
        {
          from: accountUsedToLogin,
          value: priceOffered
        });

    closeTransactionLoading()
    alertUser("Successfully Property Transfered", "alert-success", "block");
    fetchMyRequestedSales();
  }
  catch (error) {
    console.error("Error in makePayment:", error);
    closeTransactionLoading();
    alertUser(showError(error), "alert-danger", "block");
  }
}


// function: TO cancel the purchase request
async function cancelPurchaseRequestSentToSeller(saleId) {

  alertUser("", "alert-info", "none");

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  try {
    showTransactionLoading("Canceling Purchase Request Sent..");

    await contract.methods.cancelPurchaseRequestSentToSeller(
      saleId
    )
      .send({ from: accountUsedToLogin });

    closeTransactionLoading()
    alertUser("Successfully Canceled Purchase Request", "alert-success", "block");
    fetchMyRequestedSales();

  }
  catch (error) {
    console.error("Error in cancelPurchaseRequestSentToSeller:", error);
    closeTransactionLoading();
    alertUser(showError(error), "alert-danger", "block");
  }
}



async function rerequestPurchaseRequest(saleId) {

  alertUser("", "alert-info", "none");

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  price = await showPrompt().then((value) => {
    return value;
  });

  if (price != null && price != "") {
    try {

      showTransactionLoading("Re-Requesting Purchase...");

      // Workaround: Convert to Wei since smart contract's convertToWei only works with integers
      const priceInWei = web3.utils.toWei(price, 'ether');

      await contract.methods.rerequestPurchaseRequest(
        saleId,
        priceInWei  // Send Wei directly, accepting double conversion
      )
        .send({
          from: accountUsedToLogin
        })
        .on('transactionHash', function (hash) {
          // console.log("Transaction hash:", hash);
        })
        .on('receipt', function (receipt) {
          // console.log("Transaction receipt:", receipt);
        })
        .on('error', function (error, receipt) {
          console.error("Transaction error:", error);
        });

      closeTransactionLoading()
      alertUser("Request Sent Successfully", "alert-success", "block");
      fetchMyRequestedSales();
    }
    catch (error) {
      console.error("Error in rerequestPurchaseRequest:", error);
      closeTransactionLoading();
      alertUser(showError(error), "alert-danger", "block");
    }
  } else {
    alertUser("Please Enter Price", 'alert-warning', "block");
  }
}


async function rejectingAcceptanceRequestByBuyer(saleId) {


  alertUser("", "alert-info", "none");
  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  try {

    showTransactionLoading("Rejecting Acceptance Request...");
    await contract.methods.rejectingAcceptanceRequestByBuyer(
      saleId
    )
      .send({ from: accountUsedToLogin });

    closeTransactionLoading()
    alertUser("Successfully Rejected Acceptance Request", "alert-success", "block");
    fetchMyRequestedSales();

  }
  catch (error) {
    console.error("Error in rejectingAcceptanceRequestByBuyer:", error);
    closeTransactionLoading();
    alertUser(showError(error), "alert-danger", "block");
  }
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
  if (!notifyUser) return;

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

  notifyUser.innerText = msg;
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
  containerBackCover.style.display = 'block';

  // make input as empty
  input.value = "";

  // Return a Promise that resolves with the input value when "OK" is clicked, or null when "Cancel" is clicked
  return new Promise((resolve, reject) => {
    okButton.addEventListener('click', () => {
      containerBackCover.style.display = 'none';
      resolve(input.value);
    });
    cancelButton.addEventListener('click', () => {
      containerBackCover.style.display = 'none';
      resolve(null);
    });
  });
}

function refreshRequestedSales() {
  fetchMyRequestedSales();
  alertUser("Refreshing requested properties...", "alert-info", "block");
  setTimeout(() => alertUser("", "", "none"), 2000);
}


