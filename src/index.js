const { TelegramClient } = require("telegram") ;
const { NewMessage } = require("telegram/events") ;
const { StringSession } = require("telegram/sessions");
const input = require("input");
const express = require('express')
const sequelize = require("./database/database");
const { obtenerUmbralesPorMoneda, actualizarUmbralesMoneda, obtenerUmbralesTodos } = require("./database/services/umbrales.service");

const app = express();
const port = process.env.PORT  ?? 8080;

app.get('/', (req, res) => {
  res.send('Bienvenido al Bot de Ofertas P2P de Qvapay (no oficial)');
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

async function testDbConection(){
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

testDbConection();
sequelize.sync({alter: true});

const apiId = Number(process.env.TELEGRAM_API_ID) ?? '';
const apiHash = process.env.TELEGRAM_API_HASH ?? '';
const stringSession = new StringSession(process.env.TELEGRAM_STRING_SESSION ?? ''); // fill this later with the value from session.save()
const canalOfertasQvapayOficialId = 1538924093n;
const canalOfertasPersonalizadasId = -1002123114976n;
async function main(){
  console.log("Iniciando el cliente...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () =>
      await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err),
  });
  console.log("You should now be connected.");
  // console.log(client.session.save()); // Save this string to avoid logging in again

  
  client.addEventHandler(onNewOffer, new NewMessage({chats: [canalOfertasQvapayOficialId]}));  
  client.addEventHandler(onNewMsg, new NewMessage({chats: [canalOfertasPersonalizadasId]}));  

  async function onNewOffer(event) {
    const {message: text, id: msgId} = event.message;
  
    if(text.includes('CUP') || text.includes('MLC')){
      const ratioRegex = /Ratio: \$([\d.]+)/;
      const tipoOperacionRegex = /#(Compra|Venta)/; // Coincide con #Compra o #Venta
      const monedaRegex = /#(MLC|CUP)/; // Coincide con #MLC o #CUP
    
      const ratio = parseFloat(text.match(ratioRegex)[1]);
      const tipoOperacion = text.match(tipoOperacionRegex)[1];
      const moneda = text.match(monedaRegex)[1];
    
      const umbrales = await obtenerUmbralesPorMoneda(moneda)
      const umbralPorMoneda = umbrales[String(tipoOperacion).toLowerCase()];
    
      const esOfertaInteresante = (tipoOperacion, ratio, umbral) => {
          if (tipoOperacion === 'Venta' && umbral && ratio <= umbral) {
              return true;
          }
          
          if (tipoOperacion === 'Compra' && umbral && ratio >= umbral) {
              return true;
          }
    
          return false;
      }
    
      console.log({tipoOperacion, moneda, ratio, umbralPorMoneda});
      console.log({ofertaInteresante: esOfertaInteresante(tipoOperacion, ratio, umbralPorMoneda)});
  
      if(esOfertaInteresante(tipoOperacion, ratio, umbralPorMoneda)){
          await client.forwardMessages(`-100${canalOfertasPersonalizadasId}`, {fromPeer: canalOfertasQvapayOficialId, messages: msgId });
    
      }

    }
    
  }

  async function onNewMsg(event){
    const {message: text, id: msgId} = event.message;

    const esMensajeConfiguracionValido = (msg) => {
      // Definimos la expresión regular para validar el formato
      const patron = /^(CUP|MLC):(null|[0-9]+(\.[0-9]+)?):(null|[0-9]+(\.[0-9]+)?)$/;
  
      // Verificamos si la msg coincide con el patrón
      return patron.test(msg);
    }

    if(esMensajeConfiguracionValido(text)){
      const [moneda, venta, compra] = text.split(':');

      actualizarUmbralesMoneda(moneda, venta, compra)
        .then((data) => {
          if (!data) {
            client.sendMessage(canalOfertasPersonalizadasId, {
              message: "Error al actualizar la configuración!",
            }); 
            return;
          }

          client.sendMessage(canalOfertasPersonalizadasId, {
            message: "Configuración actualizada correctamente!",
          }); 
        })
        .catch((error)=> console.log(error))
    }

    if(text.startsWith("/get")){
      obtenerUmbralesTodos()
        .then((umbrales)=> {
          for (const umbral of umbrales){
            const {moneda, venta, compra } = umbral;
            client.sendMessage(canalOfertasPersonalizadasId, {
              message: `Moneda: ${moneda}\nVenta: ${venta}\nCompra: ${compra}`,
            }); 
          }
        })
        .catch((error)=> console.log(error))
    }
  }
};


main();
