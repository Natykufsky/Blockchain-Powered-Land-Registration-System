



async function connectToBlockchain() {

  notifyUser = document.getElementById("notifyUser");

  // checking Meta-Mask extension is added or not
  if (window.ethereum) {

    window.web3 = new Web3(ethereum);

    // web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:7545'));

    try {

      showTransactionLoading()

      // await ethereum.enable();

      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [
          {
            eth_accounts: {}
          }
        ]
      });

      const accounts = await web3.eth.getAccounts();
      window.localStorage.setItem("userAddress", accounts[0]);

      window.userAddress = accounts[0];


      // check whether user registered or not
      let contractABI = JSON.parse(window.localStorage.Users_ContractABI);

      let contractAddress = window.localStorage.Users_ContractAddress;

      console.log("Using Contract Address:", contractAddress);
      console.log("Using Account:", accounts[0]);

      const networkId = await web3.eth.net.getId();
      console.log("Network ID:", networkId);

      if (networkId != 5777 && networkId != "5777") {
        alertUser(`Wrong Network! Please switch MetaMask to Ganache (Network ID: 5777). Currently connected to Network ID: ${networkId}`, "alert-danger", "block");
        closeTransactionLoading();
        return;
      }

      let contract = new window.web3.eth.Contract(contractABI, contractAddress);

      userDetails = await contract.methods.users(accounts[0])
        .call()
        .then(
          function (value) {
            return value;
          });

      console.log(userDetails);


      loadingDiv = document.getElementById("loadingDiv");
      loadingDiv.style.color = "green";

      if (userDetails["userID"] == accounts[0]) {
        console.log("User Alreay Registered .. Redirecting to login");

        showTransactionLoading("Connected! Redirecting to Dashboard...");

        // redirect to dashboard
        setTimeout(() => { window.location.href = "/dashboard"; }, 500);
      }
      else {
        console.log("User Not registered.. Redirecting to register");

        showTransactionLoading("Connected! Redirecting to Registration...");

        // redirect to register
        setTimeout(() => { window.location.href = "/register"; }, 500);
      }

    } catch (error) {
      console.log(error);
      closeTransactionLoading();

      if (error.code === 4001) {
        alertUser("Connection rejected by user. Please try again.", "alert-danger", "block");
      } else {
        alertUser(showError(error), "alert-danger", "block");
      }
    }
  } else {
    alertUser("Please Add Metamask extension for your browser !!", "alert-danger", "block");
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

  notifyUser.innerHTML = msg;
  if (display === "block" || display === "flex") {
    notifyUser.classList.remove("hidden");
  } else {
    notifyUser.classList.add("hidden");
  }
}
