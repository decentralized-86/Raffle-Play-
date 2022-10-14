const { ethers } = require("hardhat");

const networkconfig = {
  31337: {
    name: "hardhat",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    subscriptionId: " 3707",
    callbackGasLimit: "500000", // 500,000
    interval: "30",
  },
  5: {
    name: "goerli",
    vrfCoordinatorv2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
    callbackGasLimit: "500000",
    subscriptionId: "0",
    interval: "30",
  },
};
const developmentchains = ["hardhat", "localhost"];
module.exports = {
  networkconfig,
  developmentchains,
};
