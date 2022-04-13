### Pinata upload

Uploads images and metadata into IPFS using Pinata. Put images to upload into the images folder. If you have metadata, put it into the metadata folder. The json files need to have the same name as the media.

Two IPFS hashes will be returned, the first one is the media folder, the second is the metadata.


## Usage

Insert your Pinata API key on the .env file

```
yarn install
yarn run upload
```
