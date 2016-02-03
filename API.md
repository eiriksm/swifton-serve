HOST: https://serve.swifton.me

# Serve Swifton.me 🍸

![Logo](/logo.png)

The `Serve` API is used to create and query about Swift Apps running on this server.

# Preamble

This service and api is provided as-is, no one takes any responsibility for what you're using it for, also no guarantees are made about uptime etc.

**Currently no authentication is needed to deploy Apps, this will change in the future. Until then Apps will most likely be shut down at any time. (When it seems like they're exhausting the system.)**

# Group Encryption and certificates

## App TLS certificates

All Swifton.me services are powered by [Let' Encrypt](letsencrypt.org) certificates where feasible. As Let's Encrypt are currently not issuing wildcard certificates, all Apps (`*.serve.swifton.me`) are being issued with a self signed certificate. SSL is currently not enforced but **highly** recommended when communicating using `*.serve.swifton.me`.

## Root certificate

You may download the root certificate here: [https://serve.swifton.me/certificate.pem](https://serve.swifton.me/certificate.pem). Using this root certificate you can ensure you're always talking to an legitimate Swifton.me App. Installing root certificates varies slightly from operating system to operating system.

## App lifespan / expiry

Any app deployed will live for a maximum of **1 day** (if not deleted earlier by you). After the maximum lifespan it will be collected by the garbage collector (aka. dustman) and killed forever. This policy will be effective during the beta phase but *might* be extended.

In the future it will be possible to deploy apps with no expiry as well as expiring apps.

There's also a limit of how many containers can be run on this system at the moment. This is constrained both by resources on this system as well as by hard-limits. Right now this limit is set to **25 containers**. This is not on a per-user but per-node basis.

# Group Command-line interface

## Prerequisites

As our CLI is based on [Node.js](https://nodejs.org), it's necessary to have a running node environment set up. In case you've never worked with node before we'd highly recommend you to [read the instructions here](https://github.com/creationix/nvm) and set up [NVM](https://github.com/creationix/nvm) to manage your node.

## Installation

Using NVM install Swifton.me CLI as follows:

```
npm install -g swifton
```

## Usage

Invoke `swifton` to see it's help menu:

```
$ swifton
Usage: swifton [options] <keywords>


Commands:

  deploy [git-url]       Deploy a Git Repository on serve.swifton.me
  delete [container-id]  Deletes an App on serve.swifton.me
  logs [container-id]    Shows your App's logs (in real time)
  status [container-id]  Query status information about your App

Options:

  -h, --help     output usage information
  -V, --version  output the version number
```

As you can see, it's right now possible to deploy, delete, see logs and the status of your App.

# Group RESTful services

## Deploy an App [/ ]

The root endpoint is used to serve the documentation when as well as to create new containers.
As you've obviously reached us via `GET` you know how to read the documentation. Congratulations 🎉.

Go on for some in-depth information on how to create containers.

**Important information about your App's container Id**

Please store your App's container Id carefully and do not share this information with anybody. Anybody in possession of this container Id can access your App's log files, other private information or even delete it.

### Deploy an App [POST]

The `configuration` attribute is optional and will default to `debug` if omitted.
The `service_uri` attribute is optional and will be a random `String` if omitted.

+ Request (application/json)
{
  repository: "https://github.com/SwiftOnMe/swifton-serve-example",
  configuration: "debug",
  service_uri: 'furious-tesla'
}

+ Response 201 (application/json)
{
  sucess: true,
  container_id: "cf556a614953fb48c9aa1bae47499132bd91b0eeaea42f356fd219f0248c7c3c",
  service_uri: "furious-tesla.serve.swifton.me"
}

## App information query API [/:containerId]

Query information about a specific App, identified by its container Id.

### Query information [GET]

+ Response 200 (application/json)
{
  created_at: "2016-01-22T23:05:22.740Z",
  status: "running",
  service_uri: "furious-tesla.serve.swifton.me"
}

## App Logs API [/:containerId/logs]

Query the Apps Stdout / Stderr logs and see what's going on.

Please be advised that this API returns a continuous stream of data and that you'll need a client capable of handling streamed data if you want to see this output in realtime. The stream is kept alive as long as your App lives. If you App is terminated, you'll see the existing log but streaming will end.

### Query Logs [GET]

+ Response 200 (text/plain)
Cloning into 'app'...
remote: Counting objects: 33, done.[K
remote: Total 33 (delta 0), reused 0 (delta 0), pack-reused 33[K
Unpacking objects:   3% (1/33)   
Unpacking objects:   6% (2/33)   
Unpacking objects:   9% (3/33)   
Unpacking objects:  12% (4/33)   
Unpacking objects:  15% (5/33)   
Unpacking objects:  18% (6/33)   
Unpacking objects:  21% (7/33)   
Unpacking objects:  24% (8/33)   
Unpacking objects:  27% (9/33)   
Unpacking objects:  30% (10/33)   
Unpacking objects:  33% (11/33)   
Unpacking objects:  36% (12/33)   
Unpacking objects:  39% (13/33)   
Unpacking objects:  42% (14/33)   
Unpacking objects:  45% (15/33)   
Unpacking objects:  48% (16/33)   
Unpacking objects:  51% (17/33)   
Unpacking objects:  54% (18/33)   
Unpacking objects:  57% (19/33)   
Unpacking objects:  60% (20/33)   
Unpacking objects:  63% (21/33)   
Unpacking objects:  66% (22/33)   
Unpacking objects:  69% (23/33)   
Unpacking objects:  72% (24/33)   
Unpacking objects:  75% (25/33)   
Unpacking objects:  78% (26/33)   
Unpacking objects:  81% (27/33)   
Unpacking objects:  84% (28/33)   
Unpacking objects:  87% (29/33)   
Unpacking objects:  90% (30/33)   
Unpacking objects:  93% (31/33)   
Unpacking objects:  96% (32/33)   
Unpacking objects: 100% (33/33)   
Unpacking objects: 100% (33/33), done.
Checking connectivity... done.
Cloning https://github.com/SwiftOnMe/swifton-serve-example.git

## Delete App API [/:containerId]

Delete an App based on its container Id.

### Delete App [DELETE]

+ Response 200

# Group One-click deployment

## Deploy One-click App [/oneclick]

Deploy an app by providing it's Git repository using URL query parameters.

When using One-click deployment, your App's container Id is appended to the the Header `Location` field thus being shown in your browser's address bar. **DO NOT SHARE THIS URI WITH OTHERS.** Everybody in charge of your container Id can delete the App.

Please store the container Id in a secret place as it's the only way for you to access your App's logs as well as to delete it.

### Deploy an App [GET]

The `configuration` attribute is optional and will default to `debug` if omitted.
The `service_uri` attribute is optional and will be a random `String` if omitted.

+ Request
  GET /oneclick?repository=https://github.com/SwiftOnMe/swifton-serve-example&configuration=debug&service_uri=furious-tesla

+ Response 302
  + Headers
    Location: http://furious-tesla.serve.swifton.me#cf556a614953fb48c9aa1bae47499132bd91b0eeaea42f356fd219f0248c7c3c
