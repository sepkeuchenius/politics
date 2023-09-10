import json
from utils import  COLLECTION, FIRESTORE_DB

doc = input("Provide path to the document you want to ingest: ")

batch = FIRESTORE_DB.batch()

with open(doc) as f:
    pars = json.load(f)
    if input(f"About to ingest {len(pars)} paragraphs. Are you sure?") == "y":
        for index, par in enumerate(pars):
            doc = COLLECTION.document()
            batch.set(doc, par)

batch.commit()