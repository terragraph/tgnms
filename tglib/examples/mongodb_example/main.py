#!/usr/bin/env python3
# Copyright 2004-present Facebook. All Rights Reserved.

"""
This example shows how to use the tglib 'init' function to create a simple
microservice which writes and reads to a MongoDB instance using tglib's MongoDB
client. To access the MongoDB client, call MongoDBClient(). To
access the underlying database, the MongoDBClient's db property. To create a
session, which can be used for logical ordering of db operations, use
MongoDBClient's session property.

For more information about using this client to perform database
operations see
https://motor.readthedocs.io/en/stable/api-asyncio/asyncio_motor_database.html

For more information on using this client to generate db session see
https://motor.readthedocs.io/en/stable/api-asyncio/asyncio_motor_client_session.html
"""


import json
import logging
import sys
from pprint import pprint
from typing import Dict

from tglib.clients.mongodb_client import MongoDBClient
from tglib.tglib import Client, init


async def main(config: Dict) -> None:
    """Get the MongoDB client and perform some db operations with it."""

    # Access the db
    db = MongoDBClient().db

    # Create a new collection in this db called "test_collection"
    db.create_collection("test_collection")
    collection = db["test_collection"]

    # Insert a document into this collection
    original_doc = {"x": 1}
    result = await collection.insert_one(original_doc)
    print(f"Inserted document's id: {repr(result.inserted_id)}")

    # Query for documents in the collection where 'x' > 1
    async for doc in collection.find({"x": {"$gt": 1}}):
        pprint(doc)

    # Remove example collection
    await db.drop_collection("test_collection")


if __name__ == "__main__":
    """Pass in the 'main' function and a set of clients into 'init'."""
    try:
        with open("./service_config.json") as f:
            config = json.load(f)
    except OSError:
        logging.exception("Failed to parse service configuration file")
        sys.exit(1)

    init(lambda: main(config), {Client.MONGODB_CLIENT})
