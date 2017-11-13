const io = require('socket.io-client');

function Service() {
  const self = this;

  self.init = config => new Promise((resolve, reject) => {
    self.config = config;

    self.socket = io.connect(self.config.socketURL,
        {transports: ['websocket']});
    self.socket.on('connect', () => {
      console.log('[%s] socket connected', new Date().toISOString());
      resolve();
    });

    self.socket.on('disconnect', () => {
      console.log('socket disconnected');
    });

    setTimeout(() => {
      reject('Could not connect to socket');
    }, 10000);
  });

  self.getMarket = () => {
    self.socket.emit('getMarket', {});
  };

  self.waitForMarket = () => new Promise((resolve, reject) => {
    setTimeout(() => {
      reject('Could not get market');
    }, 20000);
    self.state = {
      returnTicker: undefined,
    };
    const getMarketAndWait = () => {
      console.log('[%s] getMarketAndWait', new Date().toISOString());
      self.getMarket();
      self.socket.off('returnTicker');
      self.socket.once('market', (market) => {
        if (market.returnTicker) {
          self.returnTicker(market);
          // Not sure about `on`: returnTicker doesn't seem to hit this callback.
          self.socket.on('returnTicker', (ticker) => {
            console.log('[%s] socket on called?', new Date().toISOString());
            self.returnTicker(ticker);
          });
          // This actively requests a new market snapshot (i.e. actively polls).
          setTimeout(() => {
            getMarketAndWait();
          }, 60000);
          resolve();
        } else {
          setTimeout(() => {
            getMarketAndWait();
          }, 2000);
        }
      });
    };
    getMarketAndWait();
  });

  self.returnTicker = (returnTicker) => {
    console.log('[%s] new ticker: [%s]',
        new Date().toISOString(), JSON.stringify(returnTicker).substring(0, 150)
        + "...");
  }
}

const config = {
  socketURL: 'https://socket.etherdelta.com',
};

const service = new Service();
service.init(config).then(() => service.waitForMarket());
