HOST: https://serve.swifton.me

# Serve Swifton.me 🍸

The `Serve` API is used to create and query about Swift Apps running on this server.

# Preamble

This service and api is provided as-is, no one takes any responsibility for what you're using it for, also no guarantees are made about uptime etc.

**Currently no authentication is needed to deploy Apps, this will change in the future. Until then Apps will most likely be shut down at any time. (When it seems like they're exhausting the system.)**

# Group App management

## Serve API Root [/ ]

The root endpoint is used to serve the documentation when as well as to create new containers.
As you've obviously reached us via `GET` you know how to read the documentation. Congratulations 🎉.

Go on for some in-depth information on how to create containers.

### Deploy an App [POST]

+ Request (application/json)
{
  repository: "https://github.com/SwiftOnMe/swifton-serve-example"
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

### Deploy an App [GET]

+ Request
  /oneclick?repository=https://github.com/SwiftOnMe/swifton-serve-example

+ Response 302
  + Headers
    Location: http://furious-tesla.serve.swifton.me
