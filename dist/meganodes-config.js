// Poseidon ⇄ MegaNodes front-end configuration.
// IMPORTANT: never put the MegaNodes API token here. This file is public on Surge.
window.POSEIDON_CONFIG = {
  // Render backend endpoint. If Render gives you a different URL, replace it here.
  launchEndpoint: "https://poseidon-meganodes-backend.onrender.com/launch-game",

  // Default language sent to MegaNodes game launcher.
  language: "en",

  // Where the provider should return the player when they exit a game.
  returnUrl: window.location.origin + "/casino.html"
};
