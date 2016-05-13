# Replication Use Cases

NB: in the following text, "client" is equivalent to "slave replica", and "server" is equivalent to "master replica".


## 1. New Documents

1. A new document created on the client
  * document replicated to the server at the next opportunity (next replication event or whenever the client is next online)
  * documents are then identical

2. A new document created on the server
  1. In the simplest case:
    * document replicated to the client at the next opportunity (next replication event or whenever the client is next online)
    * documents are then identical
  2. However, the extended API will offer a range of features to limit and filter the data replicated from server to client. Replication will only happen if the document meets these filter criteria.

## 2. Changed Documents

1. An existing document is changed on the client, there is no change to the server's version since the last point that the documents were known to be identical
  * document change replicated to the server at the next opportunity (next replication event or whenever the client is next online)
  * documents are then identical

2. An existing document is changed on the server, which also exists on the client that has not changed since the last point that the documents were known to be identical
  * document change replicated to the client at the next opportunity (next replication event or whenever the client is next online)
  * documents are then identical

3. An existing document is changed on both the client and the server since the last point that the documents were known to be identical - "replication conflict" situation
  * the version on the server is regarded as the correct version, simply by virtue of the fact that it is on the server - in most cases it will have been replicated there from another client, and this client was either offline, or lost a "timing battle" with the other client - either way, this behaviour is "expected"
  * Until the replication conflict situation is resovled:
    * this client's changes are kept
    * this client's version of the document is not replicated back to the server
    * this client gives the user a strong visual cue that a replication conflict situation exists
    * this client shows the user the diffs between the versions in as convenient a form as possible
  * The replication conflict situation is resovled by the client user affirming that it has been:
    * The conflict changes on the client are discarded
    * Conflict resolution changes are replicated back to the server as per Use Cases 2.1. or 2.3.


