const Umbral = require("../models/umbrales.model");

async function obtenerUmbralesPorMoneda(moneda) {
  try {
    return await Umbral.findOne({where: {moneda}})
    
  } catch (error) {
    console.log(error);
    
  }
}

async function obtenerUmbralesTodos() {
  try {
    return await Umbral.findAll();
    
  } catch (error) {
    console.log(error);
    
  }
}

async function actualizarUmbralesMoneda(moneda, venta, compra) {
  try {
   
    return await Umbral.update({venta: isNaN(venta) ? null : venta, compra: isNaN(compra) ? null : compra, }, { where: {moneda}})
    
  } catch (error) {
    console.log(error);  
  }
}

module.exports = { obtenerUmbralesPorMoneda, actualizarUmbralesMoneda, obtenerUmbralesTodos }; 