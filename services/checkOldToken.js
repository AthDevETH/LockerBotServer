const axios = require("axios");

const checkIfNew = async (web3, addr) => {
    try {
        const response = await axios.get('https://api.bscscan.com/api', {
            params: {
                module: "contract",
                action: "getcontractcreation",
                contractaddresses: addr,
                apikey: "WPXGC1NBH397IYQP76M2KY8U5953QSFBZS"
            }
        })
        const hash = response.data.result[0].txHash;
        const currentBlock = await web3.eth.getBlockNumber();
        const receipt = await web3.eth.getTransactionReceipt(hash);
        
        const difference = parseInt(currentBlock) - parseInt(receipt.blockNumber);
        console.log(`difference is ${difference}`);
        if (difference < 850000) {
            return true;
        } else {
            return false;
        }
    } catch {
        return false;
    }
}

module.exports = checkIfNew;