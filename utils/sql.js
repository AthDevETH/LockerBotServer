const { Op } = require('sequelize');
const castArray = require('lodash/castArray');

const injectInclude = (...models) => {
  const modelsList = castArray(models);

  return modelsList.reduce((acc, [as, model, include]) => {
    acc.include = acc.include || [];

    acc.include.push({
      as,
      model,
      ...(include ? injectInclude(include) : {}),
    });

    return acc;
  }, {});
};

const injectWhereOr = (...conditions) => {
  return {
    [Op.or]: conditions,
  };
};

module.exports = {
  injectInclude,
  injectWhereOr,
};
