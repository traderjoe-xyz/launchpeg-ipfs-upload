import dotenv from "dotenv";
import fs from "fs";
import FormData from "form-data";
import read from "fs-readdir-recursive";
import got from "got";
import chalk from "chalk";
import cliProgress from "cli-progress";
import jsonfile from "jsonfile";
import pinataSDK, { PinataPinOptions } from "@pinata/sdk";

dotenv.config();

const currentLocation = process.cwd();
const imagesPath = currentLocation + "/images/";
const metadataPath = currentLocation + "/metadata/";
const uploadPath = currentLocation + "/upload/";

const pinDirectoryToPinata = async () => {
  const collectionName = process.argv[2];
  if (!collectionName) {
    console.log(chalk.redBright("Please enter the collection name as argument"));
    process.exit(0);
  }

  const files = read(imagesPath);
  const data = await buildFormData(files, collectionName);

  console.log(`Uploading ${files.length} files...`);
  const response = await uploadMedias(data);

  console.log(chalk.blue("Content IPFS hash :"));
  console.log(response);

  await createMetadataFiles(response.IpfsHash);

  await uploadMetadata(collectionName);

  // await unpin("QmcweR4wDJFk55LrMGBZRCXh4KsFoe2rku7HVfuBWX5o8u");
};

const buildFormData = async (files: string[], collectionName: string) => {
  const data = new FormData();
  for (const file of files) {
    if (file !== ".DS_Store") {
      data.append(`file`, fs.createReadStream(imagesPath + file), {
        filepath: collectionName + " : medias/" + file,
      });
    }
  }
  return data;
};

const uploadMedias = async (data: FormData) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(100, 0);

  const response = await got(url, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${data.getBoundary()}`,
      pinata_api_key: process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_API_SECRET,
    },
    body: data,
  }).on("uploadProgress", (progress) => {
    bar.update(Math.round(progress.percent * 100));
  });

  bar.stop();

  const parsedResponse = JSON.parse(response.body);

  return parsedResponse;
};

const createMetadataFiles = async (mediasHash: string) => {
  fs.readdir(imagesPath, async (err, files) => {
    if (err) {
      console.log(err);
    }
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
      await jsonfile
        .readFile(metadataPath + fileName + ".json")
        .then((data) => {
          metadata = data;
        })
        .catch((err) => {
          missingMetadata.push(fileName);
        });

      const uploadData = {
        image: "ipfs://" + mediasHash + "/" + file,
        ...metadata,
      };

      await jsonfile.writeFile(uploadPath + fileName, uploadData);
    }

    if (missingMetadata.length > 0) {
      if (missingMetadata.length > 5) {
        console.log(chalk.redBright(`${missingMetadata.length} metadata not found, please check`));
      } else {
        console.log(chalk.redBright("Metadata not found, please check", missingMetadata));
      }
    }
  });
};

const uploadMetadata = async (collectionName: string) => {
  const DS_StoreFile = uploadPath + ".DS_Store";

  // Creating and pinning metadata
  const pinata = pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);

  const metadataOptions: PinataPinOptions = {
    pinataMetadata: {
      name: collectionName + " : metadata",
    },
  };

  // Second upload for metadata
  pinata
    .pinFromFS(uploadPath, metadataOptions)
    .then((result) => {
      console.log(chalk.blue("Metadata IPFS hash :"), result);
    })
    .catch((err) => {
      console.log(err);
    });
};

const unpin = async (cid: string) => {
  const url = `https://api.pinata.cloud/pinning/unpin/${cid}`;

  const response = await got(url, {
    method: "DELETE",
    headers: {
      pinata_api_key: process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_API_SECRET,
    },
  });

  console.log(response.statusCode);
};

pinDirectoryToPinata();
