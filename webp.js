const imagemin = require("imagemin");
const imageminWebp = require("imagemin-webp");

const sharp = require("sharp")
const fs = require('fs');
const directory = './assets/img/Posts/webp/';

fs.rmdirSync(directory, { recursive: true })
console.log('Webp directory cleaned!');

imagemin(["./assets/img/Posts/*.{jpg,png}"], {
  destination: "./assets/img/Posts/webp/",
  plugins: [
    imageminWebp({
      //   quality: 90
      //   ,
      //   resize: {
      //     width: 1000,
      //     height: 0
      //   }
    }),
  ],
}).then(() => {
  console.log("Images Converted Successfully!!!");
}).then(() => {
    fs.readdirSync(directory).forEach(file => {
        sharp(`${directory}/${file}`)
          .resize(400) // width, height
          .toFile(`${directory}/${file}-small.webp`);
        });
});



