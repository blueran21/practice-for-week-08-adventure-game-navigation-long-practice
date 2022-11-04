const http = require('http');
const fs = require('fs');

const { Player } = require('./game/class/player');
const { World } = require('./game/class/world');

const worldData = require('./game/data/basic-world-data');

let player;
let world = new World();
world.loadWorld(worldData);

const server = http.createServer((req, res) => {

  /* ============== ASSEMBLE THE REQUEST BODY AS A STRING =============== */
  let reqBody = '';
  req.on('data', (data) => {
    reqBody += data;
  });

  req.on('end', () => { // After the assembly of the request body is finished
    /* ==================== PARSE THE REQUEST BODY ====================== */
    if (reqBody) {
      req.body = reqBody
        .split("&")
        .map((keyValuePair) => keyValuePair.split("="))
        .map(([key, value]) => [key, value.replace(/\+/g, " ")])
        .map(([key, value]) => [key, decodeURIComponent(value)])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
    }

    /* ======================== ROUTE HANDLERS ========================== */
    // Phase 1: GET /
    if (req.method === 'GET' && req.url === '/') {
      const htmlTemplate = fs.readFileSync("./views/new-player.html", "utf-8");

      const htmlPage = htmlTemplate.replace(/#{availableRooms}/g, `${world.availableRoomsToString()}`);

      res.statusCode =  200;
      res.setHeader("Content-Type", "text/html");
      res.body = htmlPage;
      return res.end(res.body);
    }

    // Phase 2: POST /player
    if (req.method === 'POST' && req.url === '/player') {
      const roomId = req.body.roomId;
      const newRoom = world.rooms[roomId];
      const playerName = req.body.name;
      player = new Player(playerName, newRoom);

      res.statusCode = 302;
      res.setHeader("Location", `/rooms/${newRoom.id}`);
      return res.end();
    }

    // check if player created
    // CheckPlayerExist(player, res);
    if (!player) {
      redirect(res);
      return res.end();
    }

    // Phase 3: GET /rooms/:roomId
    if (req.method === 'GET' && req.url.split('/').length === 3 && req.url.startsWith('/rooms/')) {
      const roomId = req.url.split('/')[2];

      if (roomId != player.currentRoom.id) {
        res.statusCode = 302;
        res.setHeader('Location', `/rooms/${player.currentRoom.id}`);
        return res.end();
      }

      const curRoom = world.rooms[roomId];

      const htmlTemplate = fs.readFileSync("./views/room.html", "utf-8");
      const htmlPage = htmlTemplate
      .replace(/#{roomName}/g, `${curRoom.name}`)
      .replace(/#{inventory}/g, `${player.inventoryToString()}`)
      .replace(/#{roomItems}/g, `${curRoom.itemsToString()}`)
      .replace(/#{exits}/g, `${curRoom.exitsToString()}`);

      res.statusCode = 200;
      res.setHeader("Content-type", "text/html");
      res.body = htmlPage;
      return res.end(res.body);
    }

    // Phase 4: GET /rooms/:roomId/:direction
    if (req.method === 'GET' && req.url.split('/').length === 4 && req.url.startsWith('/rooms/')) {
      const roomId = req.url.split('/')[2];
      const direction = req.url.split('/')[3][0];

      if (roomId != player.currentRoom.id) {
        res.statusCode = 302;
        res.setHeader('Location', `/rooms/${player.currentRoom.id}`);
        return res.end();
      }

      try {
        player.move(direction);
        res.statusCode = 302;
        res.setHeader('Location', `/rooms/${player.currentRoom.id}`);
        return res.end();
      } catch (error) {
        res.statusCode = 200;
        res.setHeader("Location", `/rooms/${player.currentRoom.id}`);
        return res.end();
      }

    }

    // Phase 5: POST /items/:itemId/:action
    if (req.method === 'POST' && req.url.split('/').length === 4 && req.url.startsWith('/items/')) {
      const itemId = req.url.split('/')[2];
      const action = req.url.split('/')[3];


      try {
        switch (action) {
          case 'drop':
            player.dropItem(itemId);
            break;
          case 'eat':
            player.eatItem(itemId);
            break;
          case 'take':
            player.takeItem(itemId);
            break;
        }
      } catch(error) {
        const htmlTemplate = fs.readFileSync('./views/error.html', 'utf-8');
        const htmlPage = htmlTemplate
        .replace(/#{errorMessage}/g, `${error.message}`)
        .replace(/#{roomId}/g, `${player.currentRoom.id}`);

        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        res.body = htmlPage;
        return res.end(res.body);
      }

      res.statusCode = 302;
      res.setHeader("Location", `/rooms/${player.currentRoom.id}`);
      return res.end();

    }

    // Phase 6: Redirect if no matching route handlers
    res.statusCode = 302;
    res.setHeader("Location", `/rooms/${player.currentRoom.id}`);
    return res.end();
  })
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));


function redirect(res) {
    res.statusCode = 302;
    res.setHeader('Location', '/');
    return res.end();
}
