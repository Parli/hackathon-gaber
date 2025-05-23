# Vetted Nest

AI-powered home design studio with product recommendations. Built on a minimalistic vanilla node.js typescript server for rapid prototyping.

## Prerequisites

Node.js 23.6.0

## Hackathon Instructions

1. Fork this repo with your project name
2. Git clone your repo to your machine
3. Initialize your env vars with `op inject -i example.env -o .env`
4. Test the server with `npm run dev`
5. Deploy it to `vetted-staging` cloud run with `npm run deploy`
6. If you want to remove it you can delete the deployment with `npm run undeploy`

## Features

### Persistant Storage

`GET /store/[hash]`

Gets an arbitrary `plain/text` string stored by its url safe base64 encoded MD5 `hash`.

`POST /store/`

Stores an arbitrary `plain/text` body string and returns the MD5 `hash` as a url safe base64 encoded plain text string.

### External Service Proxy

`[GET|POST|PUT|DELETE] /proxy/[proxy-url]`

Allows proxying to the `proxy-url`, forwarding any request and supports streaming.

Any string matching `${ENV_NAME}` in the header will replace the string with the value of that environment variable.

An accompanying `[ENV_VAR]_ACCESS` variable must be defined to allowlist proxy hosts for filling out these values to prevent leakage. The hosts must include the full host including the subdomain and can be a comma separated list of host names.

### Static File Server

`GET /[file-name]`

If no other route matches, files in the `public` directory will be returned.

This ignores the path and hash URL segments.

## Setup

### Environment Variables

`STORAGE_LOCATION` will define a custom location for writing the storage file. By default it will go to `./storage`.

A mounted cloud bucket can be used for persistence on a deployed server.

## Deployment

### Google Cloud Run

Simple Server can be easily deployed to Google Cloud Run using source based deployment.

1. [Build and deploy a Node.js app.](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service#deploy)
2. [Configure environment variables.](https://cloud.google.com/run/docs/configuring/services/environment-variables)
3. [Mount a storage bucket as a volume mount.](https://cloud.google.com/run/docs/configuring/services/cloud-storage-volume-mounts)
