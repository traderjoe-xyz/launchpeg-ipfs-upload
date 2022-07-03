import dotenv from "dotenv";
import { NFTStorage } from "nft.storage";
import { filesFromPath } from "files-from-path";
import path from "path";
import chalk from "chalk";
import fs from "fs";
import jsonfile from "jsonfile";
dotenv.config();

const currentLocation = process.cwd();
const imagesPath = currentLocation + "/images/";
const metadataPath = currentLocation + "/metadata/";
const uploadPath = currentLocation + "/upload/";

const storage = new NFTStorage({ token: process.env.NFT_STORAGE_API_KEY });

async function uploadWithNFTStorage() {
  const cid = await uploadMedia();

  await createMetadataFiles(cid);

  await uploadMetadata();

  // await storage.delete("bafybeid2hxymhvtjfbgtxpyeihg2b3ilugmobncchsox6x4sc6ldhsld4e");
}

const uploadMedia = async () => {
  const files = filesFromPath(imagesPath, {
    pathPrefix: path.resolve(imagesPath), // see the note about pathPrefix below
    hidden: false, // use the default of false if you want to ignore files that start with '.'
  });

  console.log(`Storing image files...`);
  const cid = await storage.storeDirectory(files);
  console.log({ cid });

  const status = await storage.status(cid);
  console.log(status);

  return cid;
};

const createMetadataFiles = async (mediasHash: string) => {
  let files = fs.readdirSync(imagesPath);

  files = files.filter((file) => {
    return file !== ".DS_Store";
  });

  console.log(`Importing ${files.length} files...`);

  let missingMetadata: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = file.substring(0, file.indexOf("."));
    // Content only
    let metadata;
    try {
      metadata = await jsonfile.readFileSync(metadataPath + fileName + ".json");
    } catch (err) {
      missingMetadata.push(fileName);
    }

    const uploadData = {
      image: "ipfs://" + mediasHash + "/" + file,
      ...metadata,
    };

    jsonfile.writeFileSync(uploadPath + fileName, uploadData);
  }

  if (missingMetadata.length > 0) {
    if (missingMetadata.length > 5) {
      console.log(chalk.redBright(`${missingMetadata.length} metadata not found, please check`));
    } else {
      console.log(chalk.redBright("Metadata not found, please check", missingMetadata));
    }
  }

  console.log("Metadata created");
};

const uploadMetadata = async () => {
  const files = filesFromPath(uploadPath, {
    pathPrefix: path.resolve(uploadPath), // see the note about pathPrefix below
    hidden: false, // use the default of false if you want to ignore files that start with '.'
  });

  console.log(`Storing metadata files...`);
  const cid = await storage.storeDirectory(files);
  console.log({ cid });

  const status = await storage.status(cid);
  console.log(status);

  return cid;
};

uploadWithNFTStorage();
