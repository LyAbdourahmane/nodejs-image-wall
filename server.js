const fs = require("fs");
const http = require("http");
const { Client } = require("pg");
const host = "localhost";
const port = 8095;
const server = http.createServer();
const crypto = require("crypto");

// Configuration de la connexion à la base de données et Initialisation de la base de données et accès depuis le serveur
const client = new Client({
  user: "ably",
  database: "application_image",
  port: 14864,
});

client
  .connect()
  .then(() => {
    console.log("Connected to database");
  })
  .catch((e) => {
    console.log("Error connecting to database");
    console.log(e);
  });

let lastSessionId = 0;
let sessions = [];

// Création du serveur HTTP
server.on("request", async (req, res) => {
  let hasCookieWithSessionId = false;
  let sessionId = undefined;
  // Vérification du cookie de session
  if (req.headers["cookie"] !== undefined) {
    let sessionIdInCookie = req.headers["cookie"]
      .split(";")
      .find((item) => item.trim().startsWith("session-id"));
    if (sessionIdInCookie !== undefined) {
      let sessionIdInt = parseInt(sessionIdInCookie.split("=")[1]);
      if (sessions[sessionIdInt]) {
        hasCookieWithSessionId = true;
        sessionId = sessionIdInt;
        sessions[sessionId].nbRequest++;
      }
    }
  }
  // Création d'une nouvelle session si aucune session valide n'est trouvée
  if (!hasCookieWithSessionId) {
    lastSessionId++;
    res.setHeader("Set-Cookie", `session-id=${lastSessionId}`);
    sessionId = lastSessionId;
    sessions[lastSessionId] = {
      nbRequest: 0,
    };
  }
  // Serveur statique pour les fichiers dans le répertoire /public
  if (req.url.startsWith("/public/")) {
    // Gestion des fichiers statiques
    try {
      const fichier = fs.readFileSync("." + req.url);
      res.end(fichier);
    } catch (err) {
      console.log(err);
      res.end("erreur 404");
    }
  } // Exemple d'accès à la base de données pour afficher le mur des images
  else if (req.url === "/images") {
    // Affichage du mur des images
    try {
      const idAccount = sessions[sessionId].idAccount;
      const sqlQueryImages = "SELECT * FROM images ORDER BY id ASC;";
      const sqlResultImages = await client.query(sqlQueryImages);
      const fichiersImage = sqlResultImages.rows.map((row) => row.fichier);

      let sqlQueryLikes = "";
      let likedImages = [];
      if (sessions[sessionId].username) {
        sqlQueryLikes = `SELECT id_image FROM accounts_images_like WHERE id_account = ${idAccount}`;
        const sqlResultLikes = await client.query(sqlQueryLikes);
        likedImages = sqlResultLikes.rows.map((row) => row.id_image);
      }

      let html = `<!DOCTYPE html><html lang="fr">`;
      html += `<head><link rel="stylesheet" href="/public/style.css">`;
      html += `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">`;
      html += `</head>`;
      html += `<body>`;
      if (sessions[sessionId].username) {
        html += `<div><span>Bienvenu ${sessions[sessionId].username}</span> <a href="/signout">Se deconnecter</a></div>`;
      } else {
        html += `<div ><a href="/signup">S'incrire</a></div>`;
        html += `<div ><a href="/signin">Se connecter !</a></div>`;
      }
      html += `<a href="/index.html">Index</a>`;
      html += `<div class= "center"><h1>Mur des images</h1></div>`;
      html += `<div id="mon_mur">`;
      for (let i = 0; i < fichiersImage.length; i++) {
        const fichierSmallImage = fichiersImage[i].split(".")[0] + "_small.jpg";
        html += `<a href="/page_image/${sqlResultImages.rows[i].id}"><img src="/public/images/${fichierSmallImage}"></a>`;
        if (sessions[sessionId].username) {
          if (likedImages.includes(sqlResultImages.rows[i].id)) {
            html += `<p>Liked</p>`;
          } else {
            html += `<a href="/like/${sqlResultImages.rows[i].id}">Like</a>`;
          }
        }
      }
      html += `</div>`;
      html += `</body></html>`;
      res.end(html);
    } catch (e) {
      console.log(e);
      res.statusCode = 500;
      res.end(
        "Une erreur s'est produite lors de la génération de la page. Veuillez réessayer plus tard."
      );
    }
  } else if (req.url.startsWith("/page_image")) {
    // Affichage d'une page d'image individuelle
    try {
      const imageId = req.url.split("/")[2];
      const sqlQuery = "SELECT * FROM images WHERE id = $1;";
      const sqlResult = await client.query(sqlQuery, [imageId]);
      const image = sqlResult.rows[0];

      const sqlQueryComments =
        "SELECT * FROM commentaires WHERE id_image = $1;";
      const sqlResultComments = await client.query(sqlQueryComments, [imageId]);
      const comments = sqlResultComments.rows;

      const sqlQueryNext =
        "SELECT * FROM images WHERE id > $1 ORDER BY id LIMIT 1;";
      const sqlResultNext = await client.query(sqlQueryNext, [imageId]);
      const nextImage = sqlResultNext.rows[0];

      const sqlQueryPrev =
        "SELECT * FROM images WHERE id < $1 ORDER BY id DESC LIMIT 1;";
      const sqlResultPrev = await client.query(sqlQueryPrev, [imageId]);
      const prevImage = sqlResultPrev.rows[0];

      let html = `<!DOCTYPE html><html lang="fr">`;
      html += `<head><link rel="stylesheet" href="/public/style.css">`;
      html += `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">`;
      html += `<script type="text/javascript" src='/public/page-image.js' defer></script>`;
      html += `</head>`;
      html += `<body>`;
      html += `<a href= "/images">Mur des images</a>`;
      html += `<div class="center"><img src="/public/images/${image.fichier}" width="500">`;
      html += `<p>${image.nom}</p>`; // Ajout du titre de l'image

      if (sqlResultComments.rows.length > 0) {
        html += `<h4>Commentaires</h4>`;

        for (let i = 0; i < comments.length; i++) {
          html += `<p>***${comments[i].texte}***</p>`;
        }
      }

      html += `<form action="/image-description" method="POST">`;
      html += `<h4>Ajouter un nouveau commentaire</h4>`;
      html += `<input type="hidden" name="numero" id="numero" value="${imageId}">`;
      html += `<label for="commentaire">Commentaire : </label>`;
      html += `<input type="text" name="commentaire" id="commentaire">`;
      html += `<input type="submit" value="Envoyer"></form></div>`;
      html += `<div>`;
      if (prevImage) {
        html += `<span class="left"><a href="/page_image/${
          prevImage.id
        }"><img src="/public/images/${
          prevImage.fichier.split(".jpg")[0]
        }_small.jpg"></a></span>`;
      } else {
        html += '<span class="left"></span>';
      }
      if (nextImage) {
        html += `<span class="right"><a href="/page_image/${
          nextImage.id
        }"><img src="/public/images/${
          nextImage.fichier.split(".jpg")[0]
        }_small.jpg"></a></span>`;
      }
      html += `</div></body></html>`;
      res.end(html);
    } catch (e) {
      console.log(e);
      res.end(e);
    }
  } else if (req.method === "POST" && req.url === "/image-description") {
    // Ajout d'un commentaire à une image
    let donnees = "";
    req.on("data", (dataChunk) => {
      donnees += dataChunk.toString();
    });
    req.on("end", async () => {
      const commentaire = donnees.split("&");
      const imageId = commentaire[0].split("=")[1];
      const description = commentaire[1].split("=")[1];

      const sqlQuery =
        "INSERT INTO commentaires (id_image, texte) VALUES ($1, $2);";
      await client.query(sqlQuery, [imageId, description]);

      res.statusCode = 302;
      res.setHeader("Location", "/page_image/" + imageId);
      res.end();
    });
  } else if (req.url === "/signup" && req.method === "GET") {
    res.end(generateSignFormPage(true));
  } else if (req.url === "/signup" && req.method === "POST") {
    let data;
    req.on("data", (dataChunk) => {
      data += dataChunk.toString();
    });
    req.on("end", async () => {
      try {
        const params = data.split("&");
        const username = params[0].split("=")[1];
        const password = params[1].split("=")[1];
        const findQuery = `select count(username) from accounts where username='${username}';`;
        const findResult = await client.query(findQuery);
        const USERNAME_IS_UNKNOWN = 0;
        if (parseInt(findResult.rows[0].count) === USERNAME_IS_UNKNOWN) {
          const salt = crypto.randomBytes(16).toString("hex");
          const hash = crypto
            .createHash("sha256")
            .update(password)
            .update(salt)
            .digest("hex");
          const insertQuery = `INSERT INTO accounts (username, salt, hash) VALUES ('${username}', decode('${salt}','hex') , decode('${hash}','hex'));`;
          await client.query(insertQuery);
          res.end(
            `<html><body><h1>Sign Up is a Success</h1><a href="/signin">You can sign in now !</a></body></html>`
          );
        } else {
          res.end(
            `<html><body><h1>Sign UP Failure</h1><div>Username already signed up !</div><a href="/">Retry</a></body></html>`
          );
        }
      } catch (e) {
        console.log(e);
        res.end(
          `<html><body><h1>Failure</h1><a href="/">Retry</a></body></html>`
        );
      }
    });
  } else if (req.url === "/signin" && req.method === "GET") {
    res.end(generateSignFormPage(false));
  } else if (req.url === "/signin" && req.method === "POST") {
    let data;
    req.on("data", (dataChunk) => {
      data += dataChunk.toString();
    });
    req.on("end", async () => {
      try {
        const params = data.split("&");
        const username = params[0].split("=")[1];
        const password = params[1].split("=")[1];
        const findQuery = `select username, encode(salt,'hex') as salt, encode(hash,'hex') as hash from accounts where username='${username}';`;
        const findResult = await client.query(findQuery);
        const USERNAME_IS_UNKNOWN = 0;
        if (parseInt(findResult.rows.length) !== USERNAME_IS_UNKNOWN) {
          const salt = findResult.rows[0].salt;
          const trueHash = findResult.rows[0].hash;
          const computedHash = crypto
            .createHash("sha256")
            .update(password)
            .update(salt)
            .digest("hex");
          if (trueHash === computedHash) {
            //AUTHENTICATED
            const idQuery = `SELECT id FROM accounts WHERE username='${username}';`;
            const idResult = await client.query(idQuery);
            const idAccount = idResult.rows[0].id;
            sessions[sessionId].username = username;
            sessions[sessionId].idAccount = idAccount;
            res.writeHead(302, { Location: "/" });
            res.end();
          } else {
            res.end(
              `<html><body><h1>Sign IN Failure</h1> Wrong Password ! <a href="/signin">Retry</a></body></html>`
            );
          }
        } else {
          res.end(
            `<html><body><h1>Sign IN Failure</h1> Wrong Username ! <a href="/signin">Retry</a></body></html>`
          );
        }
      } catch (e) {
        console.log(e);
        res.end(
          `<html><body><h1>Something goes wrong</h1> <a href="/">Retry</a></body></html>`
        );
      }
    });
  } else if (req.url === "/signout" && req.method === "GET") {
    // Déconnexion de l'utilisateur
    if (sessions[sessionId].username) {
      delete sessions[sessionId].username; // Supprime le nom d'utilisateur de la session
    }
    res.writeHead(302, { Location: "/" }); // Redirige l'utilisateur vers la page d'accueil
    res.end();
  } else if (req.url.startsWith("/like/")) {
    // Ajout d'un like à une image
    const idImage = req.url.split("/")[2]; // Récupérer l'id de l'image à partir de l'URL
    const idAccount = sessions[sessionId].idAccount; // Récupérer l'id du compte connecté
    const sqlQuery = `INSERT INTO accounts_images_like (id_account, id_image) VALUES (${idAccount}, ${idImage});`;
    await client.query(sqlQuery);
    res.writeHead(302, { Location: "/images" }); // Redirige l'utilisateur vers la mur des images
    res.end();
  } else if (req.url === "/statitic") {
    const SQL = "select count(*) as compter from accounts;";
    const reponse = await client.query(SQL);
    res.end(reponse.rows[0].compter);
  } else {
    try {
      const sqlQuery = "SELECT * FROM images ORDER BY date DESC LIMIT 3;";
      const sqlResult = await client.query(sqlQuery);
      const fichiersImage = sqlResult.rows.map((row) => row.fichier);

      let html = `<!DOCTYPE html><html lang="fr">`;
      html += `<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Mon Mur d'images</title><link rel="stylesheet" href="/public/style.css"></head>`;
      html += `<body>`;
      if (sessions[sessionId].username) {
        html += `<div><span>Bienvenu ${sessions[sessionId].username}</span> <a href="/signout">Se deconnecter</a></div>`;
      } else {
        html += `<div ><a href="/signup">S'inscrire</a></div>`;
        html += `<div ><a href="/signin">Se connecter !</a></div>`;
      }

      html += `<div class="center"><img src="/public/logo.png" alt="logo Guinee" width="150" height="100"><p>Vous trouverez ici toutes les images que j'aime.</p><div>`;
      for (let i = 0; i < fichiersImage.length; i++) {
        const fichierSmallImage = fichiersImage[i].split(".")[0] + "_small.jpg";
        html += `<a href="/page_image/${sqlResult.rows[i].id}"><img src="/public/images/${fichierSmallImage}"></a>`;
      }
      html += `</div><a href="/images">Toutes les Images</a></div></body></html>`;
      res.end(html);
    } catch (e) {
      console.log(e);
      res.end(e);
    }
  }
});

function generateSignFormPage(up) {
  let signWhat = up ? "signup" : "signin";
  return `<html><body><h1>${signWhat}</h1>
 <form action='/${signWhat}' method="POST">
 <label for="username">Username: </label>
 <input type="text" name="username" id="username" required>
 <label for="username">Password: </label>
 <input type="password" name="password" id="password" required>
 <input type="submit" value="${signWhat}!">
 </form>
 </body></html>`;
}

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});
