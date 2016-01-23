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

## Serve Query API [/:containerId]

Query information about a specific App, identified by its container Id.

### Query information [GET]

+ Response 200 (application/json)
{
  created_at: "2016-01-22T23:05:22.740Z",
  status: "running",
  service_uri: "furious-tesla.serve.swifton.me"
}

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
