
async function checkConnection() {

  // checking Meta-Mask extension is added or not
  if (window.ethereum) {

    try {
      //   await ethereum.enable();

      window.web3 = new Web3(ethereum);

      const accounts = await web3.eth.getAccounts();

      const account = accounts[0];

      console.log("Connected To metamask:", account);
      console.log("Account Used to Login:", window.localStorage["userAddress"])
      console.log(account != window.localStorage["userAddress"]);

      if (account != window.localStorage["userAddress"]) {
        alertUser("Wrong account detected! Please connect the correct account in MetaMask.", "alert-danger", "block");
        window.location.href = "/";
      }
      else {
        console.log("No Account changes detected !!");

        alertUser(`Wallet Connected : <span id="connectedAccount">${account.slice(0, 6)}...${account.slice(-4)} </span>`, 'alert-success', 'block');
      }

    } catch (error) {

      console.log(error);
      alertUser(showError(error), "alert-danger", "block");

    }

  } else {
    alertUser("Please Add Metamask extension for your browser !!", "alert-warning", "block");
  }

}


async function registerUser(event) {

  event.preventDefault();

  alertUser("", "alert-info", "none");

  let fname = document.getElementById("firstName").value;
  let lname = document.getElementById("lastName").value;
  let dob = document.getElementById("dob").value;
  let ninNo = document.getElementById("ninNo").value;



  let contractABI = JSON.parse(window.localStorage.Users_ContractABI);
  let contractAddress = window.localStorage.Users_ContractAddress;

  window.contract = new window.web3.eth.Contract(contractABI, contractAddress);

  let accountUsedToLogin = window.localStorage["userAddress"];

  try {
    const accounts = await web3.eth.getAccounts();
    const connectedAccountToMetaMask = accounts[0];

    if (connectedAccountToMetaMask == accountUsedToLogin) {

      showTransactionLoading("Registering User....");

      window.result = await contract.methods.registerUser(fname, lname, dob, ninNo)
        .send({ from: accountUsedToLogin });


      userDetails = await contract.methods.users(accountUsedToLogin)
        .call()
        .then(
          function (value) {
            return value;
          });

      console.log(userDetails);

      if (userDetails["userID"] == accountUsedToLogin) {
        // registarion successfull
        console.log("Registered Successfully");
        showTransactionLoading(`Registered Successfully <br> Redirecting to Dashboard`);

        // redirect to dashboard
        window.location.href = "/dashboard";
      }
      else {
        closeTransactionLoading()
        alertUser(`Registration Failed! Try again`, "alert-danger", "block");
      }
    }
    else {
      alertUser(`Account MisMatched Please Connect your account "${accountUsedToLogin.slice(0, 6)}...${accountUsedToLogin.slice(-4)}" to Metamask`, "alert-warning", "block");
    }
  }
  catch (error) {
    console.error("Registration error:", error);
    closeTransactionLoading();

    let reason;
    if (error.code === 4001) {
      reason = "Transaction rejected by user. Registration cancelled.";
    } else {
      reason = showError(error);
    }

    alertUser(reason, "alert-danger", "block");
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
