"use strict";

const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME || "hhpl9pajl",
  api_key: process.env.CLOUDINARY_KEY || "588357166175166",
  api_secret: process.env.CLOUDINARY_SECRET || "hoLZ79HTR3RKgRpxbFqK00A0ZFw"
});

module.exports.cloudinary = cloudinary;
