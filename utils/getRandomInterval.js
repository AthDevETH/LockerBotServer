module.exports = (baseSeconds) => {
  const randomSeconds = Math.floor(Math.random() * 50);

  return Math.round(randomSeconds + baseSeconds * 1000); // TODO: Shouldnt it be "return Math.round((randomSeconds + baseSeconds) * 1000)"? This extra bracket DOES make a big difference. Asking to confirm.
};
