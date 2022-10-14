const { developmentchains } = require("../helper-hardhat.config.js");
const { network } = require("hardhat");
const BASE_FEE = ethers.utils.parseEther("0.25");
const GAS_PRICE_LINKS = 1e9;
module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  if (chainId == 31337) {
    log("Local Network Detected....Deploying Mocks");
    // Deploying a VRF Coordinator------->
    //mocksv2coordinator takes 2 argument BASE_FEE && GAS_PRICE_LINK
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      args: [BASE_FEE, GAS_PRICE_LINKS],
      logs: true,
      waitConfirmations: network.config.blockConfirmations,
    });
    log("Mocks Deployed");
    log("------------------------------------------------------");
    log("____________________________________________________");
  }
};
module.exports.tags = ["all", "mocks"];
