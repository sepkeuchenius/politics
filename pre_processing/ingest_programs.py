import json
from utils import PARS, COLLECTION, COLLECTION_DOCS

if input(f"About to remove {len(COLLECTION_DOCS)} documents. Are you sure?") == "y":
    for doc in COLLECTION_DOCS:
        doc.delete()

for party in PARS:
    with open(PARS[party]) as f:
        pars = json.load(f)
        if input(f"About to ingest {len(pars)} paragraphs. Are you sure?") == "y":
            for index, par in enumerate(pars):
                COLLECTION.add({"text": par, "index":index, "party": party})