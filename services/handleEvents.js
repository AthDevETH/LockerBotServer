const unicryptABI = [
  {
    inputs: [
      { internalType: "address", name: "_lpToken", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "uint256", name: "_unlock_date", type: "uint256" },
      { internalType: "address", name: "_referral", type: "address" },
      { internalType: "bool", name: "_fee_in_eth", type: "bool" },
      { internalType: "address", name: "_withdrawer", type: "address" },
    ],
    name: "lockLPToken",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

const teamFinanceABI = [
  {
    inputs: [
      { internalType: "address", name: "_tokenAddress", type: "address" },
      { internalType: "address", name: "_withdrawalAddress", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "uint256", name: "_unlockTime", type: "uint256" },
      { internalType: "bool", name: "_mintNFT", type: "bool" },
    ],
    name: "lockToken",
    outputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
];

function getFunctionParamTypes(abi, functionSignature, web3) {
  console.log("functionSignature to find", functionSignature);

  for (const obj of abi) {
    const paramTypes = obj.inputs.map((input) => input.internalType);
    const string = `${obj.name}(${paramTypes.join(",")})`;
    const currFunctionSignature = web3.eth.abi.encodeFunctionSignature(string);

    if (currFunctionSignature === functionSignature) return paramTypes;
  }
}

const handleUnicryptEvent = (funcSignature, parameters, web3) => {
  const typesArray = getFunctionParamTypes(unicryptABI, funcSignature, web3);

  const decodedParameters = web3.eth.abi.decodeParameters(
    typesArray,
    parameters
  );

  return decodedParameters[0];
};

const handleTeamFinanceEvent = (funcSignature, parameters, web3) => {
  const typesArray = getFunctionParamTypes(teamFinanceABI, funcSignature, web3);

  const decodedParameters = web3.eth.abi.decodeParameters(
    typesArray,
    parameters
  );

  return decodedParameters[0];
};

module.exports = {
  handleUnicryptEvent,
  handleTeamFinanceEvent,
};
