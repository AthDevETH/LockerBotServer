const { ethers } = require("ethers");
const dayjs = require("dayjs");
const DbManager = require("./db/DbManager.js");
const provider = new ethers.providers.JsonRpcProvider(
  "https://mainnet.infura.io/v3/cd83284bc3674348b195a33824f074f8"
);

const TeamLockerABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "id", type: "uint256" },
      {
        indexed: true,
        internalType: "address",
        name: "tokenAddress",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "withdrawalAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "unlockTime",
        type: "uint256",
      },
    ],
    name: "Deposit",
    type: "event",
  },
];

const UniCryptABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "lpToken",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "lockDate",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "unlockDate",
        type: "uint256",
      },
    ],
    name: "onDeposit",
    type: "event",
  },
];

const blockNumberToTimestampCache = {};
async function getBlockTimestamp(blockNumber) {
  if (!blockNumberToTimestampCache[blockNumber]) {
    blockNumberToTimestampCache[blockNumber] = await provider
      .getBlock(blockNumber)
      .then((block) => {
        return block.timestamp;
      });
  }

  return blockNumberToTimestampCache[blockNumber];
}

async function main() {
  const teamLockerContract = new ethers.Contract(
    "0xE2fE530C047f2d85298b07D9333C05737f1435fB",
    TeamLockerABI,
    provider
  );

  const unicryptContract = new ethers.Contract(
    "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214",
    UniCryptABI,
    provider
  );

  const TEAM_FINANCE_START_BLOCK = 12914481;
  const UNICRYPTO_START_BLOCK = 11463946;
  const latestBlock = await provider.getBlockNumber();

  const teamFinanceDb = new DbManager(
    "./historicalLpLocks/db/storage/TeamFinanceLpLocks.json"
  );
  const unicryptDb = new DbManager(
    "./historicalLpLocks/db/storage/UniCryptLpLocks.json"
  );
  teamFinanceDb.resetDb();
  unicryptDb.resetDb();

  console.log("Fetching team finance contract");
  for (
    let currBlock = TEAM_FINANCE_START_BLOCK;
    currBlock < latestBlock;
    currBlock += 5000
  ) {
    await teamLockerContract
      .queryFilter("Deposit", currBlock - 1, currBlock + 5000)
      .then(async (events) => {
        const db = teamFinanceDb.getDb();

        for (const event of events) {
          const blockNumber = event.blockNumber;
          const lockTimestamp = await getBlockTimestamp(blockNumber);
          const unlockTimestamp = event.args.unlockTime.toString();

          db.push({
            id: event.args.id.toString(),
            tokenAddress: event.args.tokenAddress,
            withdrawalAddress: event.args.withdrawalAddress,
            amount: event.args.amount.toString(),
            unlockTime: unlockTimestamp,
            blockNumber,
            timestamp: lockTimestamp,
            formattedLockTime: dayjs
              .unix(lockTimestamp)
              .format("YYYY-MM-DD HH:mm:ss"),
            formattedUnlockTime: dayjs
              .unix(unlockTimestamp)
              .format("YYYY-MM-DD HH:mm:ss"),
            txHash: event.transactionHash,
          });
        }
        teamFinanceDb.setDb(db);
      });
  }

  console.log("Fetching unicrypt contract");
  for (
    let currBlock = UNICRYPTO_START_BLOCK;
    currBlock < latestBlock;
    currBlock += 5000
  ) {
    await unicryptContract
      .queryFilter("onDeposit", currBlock - 1, currBlock + 5000)
      .then(async (events) => {
        const db = unicryptDb.getDb();

        for (const event of events) {
          const blockNumber = event.blockNumber;
          const lockTimestamp = await getBlockTimestamp(blockNumber);
          const unlockTimestamp = event.args.unlockDate.toString();

          db.push({
            tokenAddress: event.args.lpToken,
            withdrawalAddress: event.args.user,
            amount: event.args.amount.toString(),
            unlockTime: unlockTimestamp,
            blockNumber,
            timestamp: lockTimestamp,
            formattedLockTime: dayjs
              .unix(lockTimestamp)
              .format("YYYY-MM-DD HH:mm:ss"),
            formattedUnlockTime: dayjs
              .unix(unlockTimestamp)
              .format("YYYY-MM-DD HH:mm:ss"),
            lockTime: event.args.lockDate.toString(),
            txHash: event.transactionHash,
          });
        }
        unicryptDb.setDb(db);
      });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
