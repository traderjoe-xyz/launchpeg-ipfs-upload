import dotenv from "dotenv";
import jsonfile from "jsonfile";
import fs from "fs";
import pinataSDK, { PinataPinOptions } from "@pinata/sdk";
import chalk from "chalk";
dotenv.config();
const pinata = pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);

const currentLocation = process.cwd();
const imagesPath = currentLocation + "/images/";
const metadataPath = currentLocation + "/metadata/";
const uploadPath = currentLocation + "/upload/";

const NFT_BATCH_NAME = "Test NFT series";
const mediaOptions: PinataPinOptions = {
  pinataMetadata: {
    name: NFT_BATCH_NAME + " : medias",
  },
  pinataOptions: {
    cidVersion: 1,
  },
};
const metadataOptions: PinataPinOptions = {
  pinataMetadata: {
    name: NFT_BATCH_NAME + " : metadata",
  },
  pinataOptions: {
    cidVersion: 1,
  },
};

const main = async () => {
  pinata
    .pinFromFS(imagesPath, mediaOptions)
    .then((result) => {
      console.log(chalk.blue("Images IPFS hash :"), result);
      fs.readdir(imagesPath, async (err, files) => {
        if (err) {
          console.log(err);
        }

        console.log(`Importing ${files.length} files...`);

        let missingMetadata: string[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileName = file.substring(0, file.indexOf("."));
          // Content only
          let metadata;
          await jsonfile
            .readFile(metadataPath + fileName + ".json")
            .then((data) => {
              metadata = data;
            })
            .catch((err) => {
              missingMetadata.push(fileName);
            });

          const uploadData = {
            image: "ipfs://" + result.IpfsHash + "/" + file,
            ...metadata,
          };

          await jsonfile.writeFile(uploadPath + fileName, uploadData);
        }

        if (missingMetadata.length > 0) {
          console.log(chalk.redBright("Metadata not found, please check", missingMetadata));
        }
        // Second upload for metadata
        pinata
          .pinFromFS(uploadPath, metadataOptions)
          .then((result) => {
            console.log(chalk.blue("Metadata IPFS hash :"), result);
          })
          .catch((err) => {
            console.log(err);
          });
      });
    })
    .catch((err) => {
      //handle error here
      console.log(err);
    });
};

main();
