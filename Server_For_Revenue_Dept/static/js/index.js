



async function connectToBlockchain() {

  // checking Meta-Mask extension is added or not
  if (window.ethereum) {

    window.web3 = new Web3(ethereum);


    try {
      // await ethereum.enable();

      alertUser('', 'alert-info', 'none');
      showTransactionLoading();

      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [
          {
            eth_accounts: {}
          }
        ]
      });


      const accounts = await web3.eth.getAccounts();
      window.localStorage.setItem("employeeId", accounts[0]);

      window.employeeId = accounts[0];

      // Update the new display element
      const idDisplay = document.getElementById("employeeIdDisplay");
      if (idDisplay) {
        idDisplay.innerHTML = `<strong>Connected Account:</strong><br>${accounts[0]}`;
      }

      document.getElementById("connectToBlockchainDiv").style.display = "none";
      document.getElementById("passwordDiv").style.display = "block";

      closeTransactionLoading();
      alertUser('Wallet Connected! Please enter your portal password.', 'alert-success', 'block');


    } catch (error) {
      console.log(error);
      closeTransactionLoading();
      alertUser(showError(error), 'alert-danger', 'block');
    }

  } else {
    alertUser('Please Add Metamask extension for your browser !!', 'alert-danger', 'block');
  }

}



function login() {
  let employeeId = window.localStorage["employeeId"];
  let password = document.getElementById("password").value;


  // Create a new FormData object
  const formData = new FormData();

  // Append the files and data to the FormData object
  formData.append('employeeId', employeeId);
  formData.append('password', password);

  // Send a POST request to the Flask server
  fetch('/login', {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      // Handle the response from the Flask server
      console.log(data);

      let status = data['status'];
      let msg = data['msg'];


      if (status == 1) {
        console.log(msg);
        // change
        let revenueDepartmentId = data["revenueDepartmentId"];
        window.localStorage.revenueDepartmentId = revenueDepartmentId;
        window.localStorage.empName = data['empName'];
        window.location.href = "/dashboard";
      }
      else {
        console.log(msg)
        alertUser(msg, 'alert-danger', 'block');
      }

    })
    .catch(error => {
      // Handle any errors that occur during the request
      console.error(error);
    });

}







function showTransactionLoading(msg) {
  const loadingDiv = document.getElementById("loadingDiv");
  const loadingText = document.getElementById("loadingText");
  if (loadingText) {
    loadingText.innerHTML = msg || "Processing...";
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

  console.log(msg, display);
  notifyUser = document.getElementById("notifyUser");

  notifyUser.classList = [];
  notifyUser.classList.add("alert");
  notifyUser.classList.add(msgType);
  notifyUser.innerText = msg;
  notifyUser.style.display = display;



}

