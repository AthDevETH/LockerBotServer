const { EventEmitter } = require('node:events');
/*
  TODO: Move all the blockchain logic from lockerBot to transactions services.
  LockerBot should basically manage all the derived services (transactions, monitoring) from a more macro abstract perspective.
 */
module.exports = class Transactions extends EventEmitter {
  constructor(/*  web3, routerContract, needed contracts  */) {
    super();
    /*
      this.web3 = web3;
      this.routerContract = routerContract;
      ... any other contracts or services passed down from lockerBot
     */
  }

  buy() {
    /*...*/
  }
  sell() {
    /*...*/
  }
  approve() {
    /*...*/
  }
  swap() {
    /*...*/
  }
  getBalanceAndInitialPrice() {
    /*...*/
  }
  _createERC20TokenContract() {
    /*...*/
  }
};
