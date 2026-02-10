
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



var locationId;
async function fetchPropertiesAvailabletoBuy() {
  event.preventDefault();

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];


  locationId = document.getElementById("inputLocationId").value;

  document.getElementById("salesTable").classList.remove("hidden");

  try {

    /// getting sales available on this location
    salesAvailableOnThisLocation = await contract.methods.getSalesByLocation(
      locationId
    )
      .call()
      .then(
        function (values) {
          return values;
        });

    /// getting sales created by us
    mySales = await contract.methods.getMySales(
      accountUsedToLogin
    ).call()
      .then(function (value) {
        return value;
      });

    salesCreatedByMe = [];

    for (let i = 0; i < mySales.length; i++) {
      salesCreatedByMe[i] = mySales[i]["saleId"];
    }

    /// getting sales that we already requested to buy
    myRequestedSales = await contract.methods.getRequestedSales(
      accountUsedToLogin
    ).call()
      .then(function (value) {
        return value;
      });

    myRequestedSalesId = []

    for (let i = 0; i < myRequestedSales.length; i++) {
      myRequestedSalesId[i] = myRequestedSales[i]["saleId"];
    }


    // Contract to get user details 
    contractABI = JSON.parse(window.localStorage.Users_ContractABI);
    contractAddress = window.localStorage.Users_ContractAddress;

    contract = new window.web3.eth.Contract(contractABI, contractAddress);




    let tableBody = document.getElementById("salesTableBody");

    let tableBodyCode = "";
    let tableRow = "";

    let saleId = "";
    let price = "";
    for (let i = 0; i < salesAvailableOnThisLocation.length; i++) {
      stateOfSale = salesAvailableOnThisLocation[i]["state"]

      // sale is in active state
      if (stateOfSale == "0") {
        saleId = salesAvailableOnThisLocation[i]["saleId"];
        price = web3.utils.fromWei(salesAvailableOnThisLocation[i]["price"])

        tableRow = "<tr class='hover:bg-white/5 transition-colors border-b border-white/5'>";

        tableRow += `<td class='px-6 py-4 text-sm'>${i + 1}</td>`;
        tableRow += `<td class='px-6 py-4 text-sm font-mono text-slate-400'> ${saleId} </td>`;

        userDetails = await contract.methods.users(salesAvailableOnThisLocation[i]["owner"])
          .call()
          .then(
            function (value) {
              return value;
            });

        tableRow += `<td class='px-6 py-4 text-sm'> ${userDetails["firstName"]} </td>`;
        tableRow += `<td class='px-6 py-4 text-sm font-mono text-slate-400'> ${salesAvailableOnThisLocation[i]["propertyId"]} </td>`;
        tableRow += `<td class='px-6 py-4 text-sm font-bold text-emerald-400'> ${price} ETH </td>`;


        if (myRequestedSalesId.includes(saleId)) {
          tableRow += `<td class='px-6 py-4 text-sm'><span class='text-primary font-medium bg-primary/10 px-3 py-1 rounded-full border border-primary/20'>Added To Cart</span></td>`
        }
        else if (salesCreatedByMe.includes(saleId)) {
          tableRow += `<td class='px-6 py-4 text-sm'><span class='text-slate-400 font-medium bg-white/5 px-3 py-1 rounded-full border border-white/10'>Your Property</span></td>`
        }
        else {
          tableRow += `<td class='px-6 py-4 text-sm'> 
                        <button onclick="sendPurchaseRequest(${saleId
            },${price
            })" class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-bold text-xs transition-all transform hover:-translate-y-0.5 shadow-lg shadow-primary/20">
                        BUY PROPERTY
                        </button>  
                    </td>`;
        }

        tableRow += "</tr>";

        tableBodyCode += tableRow;
      }
    }

    tableBody.innerHTML = tableBodyCode;


  }
  catch (error) {
    console.log(error);
  }


}


async function sendPurchaseRequest(saleId, price) {


  alertUser("", "alert-info", "none");

  let contractABI = JSON.parse(window.localStorage.TransferOwnership_ContractABI);

  let contractAddress = window.localStorage.TransferOwnership_ContractAddress;

  let contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  price = await showPrompt().then((value) => {
    return value;
  });

  if (price != "") {

    try {

      showTransactionLoading("Sending Purchase Request...");

      // Workaround: Smart contract multiplies by 10^18, but only supports integers
      // So we convert to Wei first, then divide by 10^18 to cancel out contract's multiplication
      const priceInWei = web3.utils.toWei(price, 'ether');
      const priceAsNumber = priceInWei; // Send Wei value, contract will multiply unnecessarily

      await contract.methods.sendPurchaseRequest(
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
          closeTransactionLoading();
          alertUser("Sent Purchase Request Successfully", "alert-success", "block");


          form = document.getElementById("inputLocationIdForm");
          input = document.getElementById("inputLocationId");
          input.value = locationId;

          submitButton = form.children[1];
          submitButton.click();
        })
        .on('error', function (error, receipt) {
          console.error("Transaction error:", error);
          closeTransactionLoading();
          alertUser(showError(error), "alert-danger", "block");
        });
    }
    catch (error) {
      console.error("Outer error during purchase request:", error);
      closeTransactionLoading();
      alertUser(showError(error), "alert-danger", "block");
    }

  } else {
    alertUser("Please Enter Price", "alert-info", "block");
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

function refreshAvailableSales() {
  fetchPropertiesAvailabletoBuy();
  alertUser("Refreshing available sales...", "alert-info", "block");
  setTimeout(() => alertUser("", "", "none"), 2000);
}
