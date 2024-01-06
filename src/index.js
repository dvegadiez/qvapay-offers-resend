const { TelegramClient } = require("telegram") ;
const { NewMessage } = require("telegram/events") ;
const { StringSession } = require("telegram/sessions");
const input = require("input");
const config = require("./config");
const express = require('express')
const sequelize = require("./database/database");
const { obtenerUmbralesPorMoneda } = require("./database/services/umbrales.service");

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

  
  client.addEventHandler(onNewMessageRecieved, new NewMessage({chats: [1538924093n]}));  
  
  async function onNewMessageRecieved(event, clin) {
    const {message: text, id: msgId} = event.message;
    // console.log(text);
  
    const ratioRegex = /Ratio: \$([\d.]+)/;
    const tipoOperacionRegex = /#(Compra|Venta)/; // Coincide con #Compra o #Venta
    const monedaRegex = /#(MLC|CUP)/; // Coincide con #MLC o #CUP
  
    const ratio = parseFloat(text.match(ratioRegex)[1]);
    const tipoOperacion = text.match(tipoOperacionRegex)[1];
    const moneda = text.match(monedaRegex)[1];
    const umbral = config[moneda][tipoOperacion];
  
    const umbrales = await obtenerUmbralesPorMoneda(moneda)
    const umbralPorMoneda = umbrales[String(tipoOperacion).toLowerCase()];
  
    const esOfertaBuena = (tipoOperacion, ratio, umbral) => {
        if (tipoOperacion === 'Venta' && umbral && ratio <= umbral) {
            return true;
        }
        
        if (tipoOperacion === 'Compra' && umbral && ratio >= umbral) {
            return true;
        }
  
        return false;
    }
  
    console.log({tipoOperacion, moneda, ratio, umbralPorMoneda});
    console.log({ofertaInteresante: esOfertaBuena(tipoOperacion, ratio, umbralPorMoneda)});
    if(esOfertaBuena(tipoOperacion, ratio, umbralPorMoneda)){
        await client.forwardMessages(-1002123114976n, {fromPeer: -1001538924093n, messages: msgId });
  
    }
    
  }
};


main();
