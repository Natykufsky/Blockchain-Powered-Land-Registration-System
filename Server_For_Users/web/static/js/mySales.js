var MySales = null;


// Contract to get user details 
var UsersContractABI = JSON.parse(window.localStorage.Users_ContractABI);
var UsersContractAddress = window.localStorage.Users_ContractAddress;

var UsersContract = null;






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
        UsersContract = new window.web3.eth.Contract(UsersContractABI, UsersContractAddress);
        fetchUserDetails();
        fetchMyPropertiesAvailableToSell();
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




async function fetchMyPropertiesAvailableToSell() {


  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  try {

    mySales = await contract.methods.getMySales(
      accountUsedToLogin
    ).call()
      .then(function (value) {
        return value;
      });

    MySales = mySales;

    let tableBody = document.getElementById("salesTableBody");

    let tableBodyCode = "";
    let tableRow = "";

    for (let i = 0; i < mySales.length; i++) {
      tableRow = "<tr class='hover:bg-white/5 transition-colors border-b border-white/5'>";

      tableRow += `<td class='px-6 py-4 text-sm'>${i + 1}</td>`;
      tableRow += `<td class='px-6 py-4 text-sm font-mono text-slate-400'>${mySales[i]["saleId"]}</td>`;
      tableRow += `<td class='px-6 py-4 text-sm font-mono text-slate-400'>${mySales[i]["propertyId"]}</td>`;
      tableRow += `<td class='px-6 py-4 text-sm font-bold text-slate-300'>${web3.utils.fromWei(mySales[i]["price"])} ETH</td>`;


      acceptedFor = mySales[i]["acceptedFor"];
      if (acceptedFor == "0x0000000000000000000000000000000000000000") {
        acceptedFor = `class='px-6 py-4 text-sm'> <span class='text-slate-500 italic'>No one yet</span>`
      }
      else {
        userDetails = await UsersContract.methods.users(mySales[i]["acceptedFor"])
          .call()
          .then(
            function (value) {
              return value;
            });

        acceptedFor = `class='px-6 py-4 text-sm text-primary font-medium'> ${userDetails["firstName"]}`;
      }


      tableRow += `<td ${acceptedFor} </td>`;
      tableRow += `<td class='px-6 py-4 text-sm'> ${handleStateOfProperty(mySales[i])} </td>`;

      // Sale is Not Canceled
      if (mySales[i]['state'] != 2) {

        // When sale is in Active State
        if (mySales[i]["state"] == 0) {
          tableRow += "<td class='px-6 py-4 text-sm'>" +
            "<button onclick=fetchRequestedUsersToBuy(" +
            mySales[i]["saleId"] + "," +
            mySales[i]["propertyId"]
            + ") class='bg-primary/10 hover:bg-primary text-primary hover:text-white px-3 py-1 rounded-lg border border-primary/20 transition-all text-xs font-bold'> View Buyers </button> " +
            "</td>";

          tableRow += `<td class='px-6 py-4 text-sm'> <button onclick="cancelSale(${mySales[i]["saleId"]})" class="text-red-400 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-wider">Cancel Sale</button> </td>`;
        }
        else if (mySales[i]["state"] == 1) {
          tableRow += `<td class='px-6 py-4 text-sm'> 
                          <button onclick="rejectingAcceptanceRequestBySeller(${mySales[i]["saleId"]})" class="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1 rounded-lg border border-red-500/20 transition-all text-xs font-semibold">
                            Cancel Acceptance
                          </button>
                      </td>
                      <td class='px-6 py-4 text-sm text-center text-slate-600'> - </td>`;
        }
        else if (mySales[i]["state"] == 3) {
          tableRow += `<td class='px-6 py-4 text-sm text-center text-slate-600'> - </td> <td class='px-6 py-4 text-sm text-center text-slate-600'> - </td>`;
        }
        else if ((mySales[i]["state"] == 4) || (mySales[i]["state"] == 5) || (mySales[i]["state"] == 6)) {
          tableRow += `<td class='px-6 py-4 text-sm'> 
                            <button onclick="reactivateSale(${mySales[i]["saleId"]})" class="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-lg border border-emerald-500/20 transition-all text-xs font-bold"> Reactivate </button> 
                       </td>
                       <td class='px-6 py-4 text-sm'> 
                            <button onclick="cancelSale(${mySales[i]["saleId"]})" class="text-red-400 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-wider">
                              Cancel
                            </button>
                      </td>`;
        }



      }
      else {
        tableRow += `<td class='px-6 py-4 text-sm text-center text-slate-600'> - </td> <td class='px-6 py-4 text-sm text-center text-slate-600'> - </td>`;
      }


      tableRow += "</tr>";

      tableBodyCode += tableRow;
    }

    tableBody.innerHTML = tableBodyCode;


  }
  catch (error) {
    console.log(error);
    showError(error);
  }

}


function handleStateOfProperty(sale) {
  saleState = sale["state"];

  if (saleState == 0) {
    return `<span class='px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium border border-blue-500/20'>Active</span>`;
  }
  else if (saleState == 1) {
    return `<span class='px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20'>Accepted</span>`;
  }
  else if (saleState == 2) {
    return `<span class='px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium border border-red-500/20'>Closed</span>`;
  }
  else if (saleState == 3) {
    return `<span class='px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30'>Success</span>`;
  }
  else if (saleState == 4) {
    return `<span class='px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium border border-amber-500/20'>Deadline Over</span>`;
  }
  else if (saleState == 5) {
    return `<span class='px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 text-center'>Canceled Acceptance</span>`;
  }
  else if (saleState == 6) {
    return `<span class='px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 text-center'>Buyer Rejected</span>`;
  }
  else {
    return "Invalid";
  }

}



async function fetchRequestedUsersToBuy(saleId, propertyId) {

  alertUser("", "alert-info", "none");
  toggleSalesAndRequestedUsersTables();

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
    console.log(requestedUsersForASale);



    document.getElementById("propertyId").innerText = propertyId;
    let tableBody = document.getElementById("requestedUsersOfaSaleTableBody");

    let tableBodyCode = "";
    let tableRow = "";
    let price = "";

    for (let i = 0; i < requestedUsersForASale.length; i++) {

      price = web3.utils.fromWei(requestedUsersForASale[i]["priceOffered"])

      userDetails = await UsersContract.methods.users(requestedUsersForASale[i]["user"])
        .call()
        .then(
          function (value) {
            return value;
          });

      state = requestedUsersForASale[i]["state"];

      tableRow = "<tr class='hover:bg-white/5 transition-colors border-b border-white/5'>";

      tableRow += `<td class='px-6 py-4 text-sm'>${i + 1}</td>`;
      tableRow += `<td class='px-6 py-4 text-sm'>${userDetails["firstName"]}</td>`;
      tableRow += `<td class='px-6 py-4 text-sm font-bold text-emerald-400'>${price} ETH</td>`;



      if (state == 0) {
        tableRow += `<td class='px-6 py-4 text-sm flex gap-3'>
        <button class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-lg shadow-emerald-500/20" onclick="acceptPurchaseRequest(${saleId}, '${requestedUsersForASale[i]["user"]}', '${price}')">
          Accept
        </button>
     
        <button class="bg-white/5 hover:bg-white/10 text-red-400 px-4 py-2 rounded-lg border border-white/10 transition-all text-xs font-bold" onclick="rejectPurchaseRequest(${saleId}, '${requestedUsersForASale[i]["user"]}')">
          Reject
        </button>
      </td>`
      }
      else if (state == 1) {
        tableRow += `<td class='px-6 py-4 text-sm'> <span class='text-red-400 font-medium'>Buyer Canceled</span> </td>`;
      }
      else if (state == 2) {
        tableRow += `<td class='px-6 py-4 text-sm'> <span class='text-emerald-500 font-medium'>Accepted</span> </td>`;
      }
      else if (state == 3) {
        tableRow += `<td class='px-6 py-4 text-sm'> <span class='text-slate-500 font-medium'>Rejected</span> </td>`;
      }
      else if (state == 4) {
        tableRow += `<td class='px-6 py-4 text-sm flex flex-col gap-2'> 
                        <span class='text-amber-500 text-xs font-medium'>Canceled Acceptance</span>
                        <div class='flex gap-2'>
                          <button class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold" onclick="acceptPurchaseRequest(${saleId}, '${requestedUsersForASale[i]["user"]}', '${price}')">Accept again</button>
                          <button class="bg-white/5 text-red-400 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold" onclick="rejectPurchaseRequest(${saleId}, '${requestedUsersForASale[i]["user"]}')">Reject again</button>
                        </div>
                      </td>`;
      }
      else if (state == 5) {
        tableRow += `<td class='px-6 py-4 text-sm text-red-400'> Buyer Rejected Acceptance </td>`;

      }
      else if (state == 6) {
        tableRow += `<td class='px-6 py-4 text-sm flex flex-col gap-2'> 
                        <span class='text-primary text-xs font-medium italic'>Re-Requested</span>
                        <div class='flex gap-2'>
                          <button class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold" onclick="acceptPurchaseRequest(${saleId}, '${requestedUsersForASale[i]["user"]}', '${price}')">Accept again</button>
                          <button class="bg-white/5 text-red-400 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold" onclick="rejectPurchaseRequest(${saleId}, '${requestedUsersForASale[i]["user"]}')">Reject again</button>
                        </div>
                      </td>`;

      }
      else {
        tableRow += `<td class='px-6 py-4 text-sm text-slate-600 italic'> Invalid State </td>`;

      }




      tableRow += "</tr>";

      tableBodyCode += tableRow;
    }

    tableBody.innerHTML = tableBodyCode;


  }
  catch (error) {
    console.log(error);
    showError(error);
  }

}


async function acceptPurchaseRequest(saleId, buyer, priceOffered) {

  alertUser("", "alert-info", "block");

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  // Workaround: Convert to Wei since smart contract's convertToWei only works with integers
  const priceInWei = web3.utils.toWei(String(priceOffered), 'ether');

  try {


    showTransactionLoading("Accepting Buyer Request...");

    saleAcceptedEvent = await contract.methods.acceptBuyerRequest(
      saleId,
      buyer,
      priceInWei  // Send Wei directly, accepting double conversion
    ).send({ from: accountUsedToLogin })
      .then(
        function (tx) {
          return tx.events.SaleAccepted.returnValues;
        });

    console.log(saleAcceptedEvent);

    closeTransactionLoading();
    toggleSalesAndRequestedUsersTables();
    alertUser("Successfully Accepted Buyer Request", "alert-success", "block");
    fetchMyPropertiesAvailableToSell();
  }
  catch (error) {
    console.error("Error in acceptPurchaseRequest:", error);
    closeTransactionLoading();
    alertUser(showError(error), "alert-danger", "block");
  }
}


async function cancelSale(saleId) {

  alertUser("", "alert-info", "none");

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];


  try {

    showTransactionLoading("Canceling Sale...");

    await contract.methods.cancelSaleBySeller(
      saleId
    ).send({ from: accountUsedToLogin })
      .then(
        function (value) {
          console.log(value);
        });

    showTransactionLoading("Fetching Properties...");
    fetchMyPropertiesAvailableToSell();
    closeTransactionLoading();

    alertUser("Successfully Canceled Sale", "alert-success", "block");
  }
  catch (error) {
    console.error("Error in cancelSale:", error);
    closeTransactionLoading();
    alertUser(showError(error), "alert-danger", "block");
  }
}



function moreDetailsAboutSale(indexOfSale) {

  let sale = MySales[indexOfSale];
  console.log(sale);

}



async function rejectingAcceptanceRequestBySeller(saleId) {

  alertUser("", "alert-info", "block");

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];


  try {

    showTransactionLoading("Canceling Acceptance Request...");

    await contract.methods.rejectingAcceptanceRequestBySeller(
      saleId
    ).send({ from: accountUsedToLogin })
      .then(
        function (value) {
          console.log(value);
        });


    closeTransactionLoading();
    alertUser("Successfully Canceled Acceptance Request", "alert-success", "block");
    fetchMyPropertiesAvailableToSell();
  }
  catch (error) {
    console.error("Error in rejectingAcceptanceRequestBySeller:", error);
    closeTransactionLoading();
    alertUser(showError(error), "alert-danger", "block");
  }
}





async function reactivateSale(saleId) {

  alertUser("", "alert-info", "block");

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];


  try {

    showTransactionLoading("Reactivating Sale...");

    await contract.methods.reactivateSale(
      saleId
    ).send({ from: accountUsedToLogin })
      .then(
        function (value) {
          console.log(value);
        });

    closeTransactionLoading();
    alertUser("Successfully Reactivated Sale", "alert-success", "block");
    fetchMyPropertiesAvailableToSell();
  }
  catch (error) {
    console.error("Error in reactivateSale:", error);
    closeTransactionLoading();
    alertUser(showError(error), "alert-danger", "block");
  }
}




async function rejectPurchaseRequest(saleId, buyer) {

  alertUser("", "alert-info", "block");

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];


  try {


    showTransactionLoading("Rejecting Purchasing Reqest of Buyer...");

    await contract.methods.rejectPurchaseRequestOfBuyer(
      saleId,
      buyer
    ).send({ from: accountUsedToLogin })
      .then(
        function (value) {
          console.log(value);
        });


    closeTransactionLoading();
    alertUser("Successfully Rejected Buyer Request", "alert-success", "block");
    propertyId = document.getElementById("propertyId").innerText;
    fetchRequestedUsersToBuy(saleId, propertyId);
  }
  catch (error) {
    console.error("Error in rejectPurchaseRequest:", error);
    closeTransactionLoading();
    alertUser(showError(error), "alert-danger", "block");
  }
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


function toggleSalesAndRequestedUsersTables() {
  alertUser("", "alert-info", "none");

  const salesTable = document.getElementById("salesTable");
  const requestedUsersOfaSale = document.getElementById("requestedUsersOfaSale");

  if (!salesTable.classList.contains("hidden")) {
    salesTable.classList.add("hidden");
    requestedUsersOfaSale.classList.remove("hidden");
  } else {
    salesTable.classList.remove("hidden");
    requestedUsersOfaSale.classList.add("hidden");
  }
}

function refreshMySales() {
  fetchMyPropertiesAvailableToSell();
  alertUser("Refreshing listed properties...", "alert-info", "block");
  setTimeout(() => alertUser("", "", "none"), 2000);
}
