const Umbral = require("../models/umbrales.model");

async function obtenerUmbralesPorMoneda(moneda) {
  try {
    return await Umbral.findOne({where: {moneda}})
    
  } catch (error) {
    console.log(error);
    
  }
}

module.exports = { obtenerUmbralesPorMoneda }; 