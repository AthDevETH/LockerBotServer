const DbManager = require("./db/DbManager.js");
const dayjs = require("dayjs");

const DATE_FORMAT = "YYYY-MM-DD HH:mm:ss";

function getStartOfWeek(unixTimestamp) {
  return dayjs
    .unix(unixTimestamp)
    .day(0)
    .hour(0)
    .minute(0)
    .second(0)
    .millisecond(0);
}

function getEndOfWeek(unixTimestamp) {
  return dayjs
    .unix(unixTimestamp)
    .day(6)
    .hour(23)
    .minute(59)
    .second(59)
    .millisecond(999);
}

function tallyNewData(dbManager, rawDeposits) {
  dbManager.resetDb();

  const talliedData = dbManager.getDb();

  for (const deposit of rawDeposits) {
    const startOfTheWeekTimestamp = getStartOfWeek(deposit.timestamp);
    const endOfTheWeekTimestamp = getEndOfWeek(deposit.timestamp);

    let talliedDeposit = talliedData.find(
      (data) => data.startOfTheWeekTimestamp === startOfTheWeekTimestamp.unix()
    );

    if (!talliedDeposit) {
      talliedDeposit = {
        startOfTheWeekTimestamp: startOfTheWeekTimestamp.unix(),
        formattedStartOfTheWeek: startOfTheWeekTimestamp.format(DATE_FORMAT),
        endOfTheWeekTimestamp: endOfTheWeekTimestamp.unix(),
        formattedEndOfTheWeek: endOfTheWeekTimestamp.format(DATE_FORMAT),
        totalLpLocked: 0,
      };
      talliedData.push(talliedDeposit);
    }
    talliedDeposit.totalLpLocked += 1;
  }

  dbManager.setDb(talliedData);
}

function main() {
  const teamFinanceDb = new DbManager(
    "./historicalLpLocks/db/storage/TeamFinanceLpLocks.json"
  );
  const unicryptDb = new DbManager(
    "./historicalLpLocks/db/storage/UniCryptLpLocks.json"
  );

  const teamFinanceDeposits = teamFinanceDb.getDb();
  const unicryptDeposits = unicryptDb.getDb();

  const talliedTeamFinanceDb = new DbManager(
    "./historicalLpLocks/db/storage/TalliedTeamFinanceLpLocks.json"
  );
  const talliedUnicryptDb = new DbManager(
    "./historicalLpLocks/db/storage/TalliedUniCryptLpLocks.json"
  );

  tallyNewData(talliedTeamFinanceDb, teamFinanceDeposits);
  tallyNewData(talliedUnicryptDb, unicryptDeposits);
}

main();
