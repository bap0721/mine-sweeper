// src/wallet.js
import { ethers } from "ethers";

export const connectWallet = async () => {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      return {
        account: accounts[0],
        signer,
      };
    } catch (err) {
      console.error("Error connecting wallet:", err);
      return null;
    }
  } else {
    alert("⚠️ Please install MetaMask!");
    return null;
  }
};
