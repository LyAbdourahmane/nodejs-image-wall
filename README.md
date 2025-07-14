# nodejs-image-wall
Serveur HTTP complet en Node.js sans framework, permettant la gestion d’un mur d’images dynamique avec authentification, likes et commentaires. Utilisation de PostgreSQL pour le stockage et gestion manuelle des sessions.

# Node.js Image Wall

Ce projet consiste en la création d’un serveur HTTP complet en Node.js, développé sans framework, pour gérer un mur d’images dynamique. Les utilisateurs peuvent s’inscrire, se connecter, publier des images, liker et commenter les publications. La gestion des sessions est réalisée manuellement via des cookies. Les données (comptes, images, likes, commentaires) sont stockées dans une base PostgreSQL.

## Fonctionnalités

- Serveur HTTP natif utilisant le module `http` de Node.js
- Gestion manuelle des sessions en mémoire avec cookies HTTP
- Authentification sécurisée avec salage et hachage SHA-256 des mots de passe
- Publication et affichage dynamique d’un mur d’images
- Ajout de likes et commentaires par les utilisateurs
- Rendu HTML dynamique sans moteur de template
- Utilisation de Tailwind CSS pour le style frontend

## Technologies utilisées

- Node.js (http, fs, crypto)
- PostgreSQL (node-postgres)
- JavaScript asynchrone (async/await)
- Tailwind CSS

## Installation

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/tonPseudo/nodejs-image-wall.git
2. Installer les dépendances PostgreSQL et Node.js.
3. Configurer la base de données PostgreSQL (fichier SQL fourni).
4. Lancer le serveur :

bash
- node server.js

## Usage
Accéder au serveur via http://localhost:3000, s’inscrire, puis utiliser le mur d’images.
